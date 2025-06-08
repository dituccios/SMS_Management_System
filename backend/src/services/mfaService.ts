import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { EmailService } from './emailService';

const prisma = new PrismaClient();

export interface MFASetupResult {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

export interface MFAVerificationResult {
  success: boolean;
  message: string;
  remainingAttempts?: number;
}

export class MFAService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Setup TOTP (Time-based One-Time Password) for a user
   */
  async setupTOTP(userId: string, userEmail: string): Promise<MFASetupResult> {
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `SMS Management (${userEmail})`,
        issuer: 'SMS Management System',
        length: 32
      });

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Store MFA configuration
      await prisma.mFAConfiguration.upsert({
        where: { userId },
        update: {
          totpSecret: this.encrypt(secret.base32),
          backupCodes: backupCodes.map(code => this.hashBackupCode(code)),
          isEnabled: false, // Will be enabled after verification
          setupAt: new Date()
        },
        create: {
          userId,
          type: 'TOTP',
          totpSecret: this.encrypt(secret.base32),
          backupCodes: backupCodes.map(code => this.hashBackupCode(code)),
          isEnabled: false,
          setupAt: new Date()
        }
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

      logger.info(`MFA TOTP setup initiated for user ${userId}`);

      return {
        secret: secret.base32,
        qrCodeUrl,
        backupCodes,
        manualEntryKey: secret.base32
      };
    } catch (error) {
      logger.error('Failed to setup TOTP MFA', error);
      throw error;
    }
  }

  /**
   * Verify TOTP token and enable MFA
   */
  async verifyAndEnableTOTP(userId: string, token: string): Promise<MFAVerificationResult> {
    try {
      const mfaConfig = await prisma.mFAConfiguration.findUnique({
        where: { userId }
      });

      if (!mfaConfig || !mfaConfig.totpSecret) {
        return {
          success: false,
          message: 'MFA not configured for this user'
        };
      }

      const secret = this.decrypt(mfaConfig.totpSecret);
      
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2 // Allow 2 time steps (60 seconds) tolerance
      });

      if (verified) {
        // Enable MFA
        await prisma.mFAConfiguration.update({
          where: { userId },
          data: {
            isEnabled: true,
            verifiedAt: new Date()
          }
        });

        // Log successful MFA setup
        await this.logMFAEvent(userId, 'MFA_ENABLED', 'TOTP MFA successfully enabled');

        logger.info(`MFA TOTP enabled for user ${userId}`);

        return {
          success: true,
          message: 'MFA successfully enabled'
        };
      } else {
        await this.logMFAEvent(userId, 'MFA_VERIFICATION_FAILED', 'Invalid TOTP token during setup');
        
        return {
          success: false,
          message: 'Invalid verification code'
        };
      }
    } catch (error) {
      logger.error('Failed to verify and enable TOTP', error);
      throw error;
    }
  }

  /**
   * Verify MFA token during login
   */
  async verifyMFA(userId: string, token: string, ipAddress?: string): Promise<MFAVerificationResult> {
    try {
      const mfaConfig = await prisma.mFAConfiguration.findUnique({
        where: { userId }
      });

      if (!mfaConfig || !mfaConfig.isEnabled) {
        return {
          success: false,
          message: 'MFA not enabled for this user'
        };
      }

      // Check for rate limiting
      const recentAttempts = await prisma.mFAAttempt.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
          }
        }
      });

      if (recentAttempts >= 5) {
        await this.logMFAEvent(userId, 'MFA_RATE_LIMITED', 'Too many MFA attempts', ipAddress);
        return {
          success: false,
          message: 'Too many attempts. Please try again later.'
        };
      }

      // Try TOTP verification first
      if (mfaConfig.totpSecret) {
        const secret = this.decrypt(mfaConfig.totpSecret);
        const verified = speakeasy.totp.verify({
          secret,
          encoding: 'base32',
          token,
          window: 2
        });

        if (verified) {
          await this.logMFAEvent(userId, 'MFA_SUCCESS', 'TOTP verification successful', ipAddress);
          return {
            success: true,
            message: 'MFA verification successful'
          };
        }
      }

      // Try backup code verification
      const backupCodeVerified = await this.verifyBackupCode(userId, token);
      if (backupCodeVerified) {
        await this.logMFAEvent(userId, 'MFA_SUCCESS', 'Backup code verification successful', ipAddress);
        return {
          success: true,
          message: 'MFA verification successful (backup code used)'
        };
      }

      // Log failed attempt
      await prisma.mFAAttempt.create({
        data: {
          userId,
          success: false,
          ipAddress,
          userAgent: 'Unknown'
        }
      });

      await this.logMFAEvent(userId, 'MFA_FAILED', 'Invalid MFA token', ipAddress);

      const remainingAttempts = Math.max(0, 5 - recentAttempts - 1);

      return {
        success: false,
        message: 'Invalid MFA code',
        remainingAttempts
      };
    } catch (error) {
      logger.error('Failed to verify MFA', error);
      throw error;
    }
  }

  /**
   * Disable MFA for a user
   */
  async disableMFA(userId: string, adminUserId?: string): Promise<void> {
    try {
      await prisma.mFAConfiguration.update({
        where: { userId },
        data: {
          isEnabled: false,
          disabledAt: new Date()
        }
      });

      await this.logMFAEvent(
        userId, 
        'MFA_DISABLED', 
        adminUserId ? `MFA disabled by admin ${adminUserId}` : 'MFA disabled by user'
      );

      logger.info(`MFA disabled for user ${userId}`, { adminUserId });
    } catch (error) {
      logger.error('Failed to disable MFA', error);
      throw error;
    }
  }

  /**
   * Generate new backup codes
   */
  async generateNewBackupCodes(userId: string): Promise<string[]> {
    try {
      const backupCodes = this.generateBackupCodes();

      await prisma.mFAConfiguration.update({
        where: { userId },
        data: {
          backupCodes: backupCodes.map(code => this.hashBackupCode(code)),
          backupCodesGeneratedAt: new Date()
        }
      });

      await this.logMFAEvent(userId, 'BACKUP_CODES_GENERATED', 'New backup codes generated');

      logger.info(`New backup codes generated for user ${userId}`);

      return backupCodes;
    } catch (error) {
      logger.error('Failed to generate new backup codes', error);
      throw error;
    }
  }

  /**
   * Send MFA code via SMS (if configured)
   */
  async sendSMSCode(userId: string, phoneNumber: string): Promise<void> {
    try {
      const code = this.generateSMSCode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      await prisma.mFASMSCode.create({
        data: {
          userId,
          code: this.hashSMSCode(code),
          phoneNumber,
          expiresAt
        }
      });

      // Send SMS (implement with your SMS provider)
      // await this.smsService.sendSMS(phoneNumber, `Your SMS verification code is: ${code}`);

      await this.logMFAEvent(userId, 'SMS_CODE_SENT', `SMS code sent to ${phoneNumber.slice(-4)}`);

      logger.info(`MFA SMS code sent to user ${userId}`);
    } catch (error) {
      logger.error('Failed to send SMS code', error);
      throw error;
    }
  }

  /**
   * Get MFA status for a user
   */
  async getMFAStatus(userId: string): Promise<any> {
    try {
      const mfaConfig = await prisma.mFAConfiguration.findUnique({
        where: { userId },
        select: {
          type: true,
          isEnabled: true,
          setupAt: true,
          verifiedAt: true,
          backupCodesCount: true
        }
      });

      return {
        enabled: mfaConfig?.isEnabled || false,
        type: mfaConfig?.type || null,
        setupAt: mfaConfig?.setupAt || null,
        verifiedAt: mfaConfig?.verifiedAt || null,
        hasBackupCodes: (mfaConfig?.backupCodesCount || 0) > 0
      };
    } catch (error) {
      logger.error('Failed to get MFA status', error);
      throw error;
    }
  }

  private generateBackupCodes(): string[] {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  private generateSMSCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  private hashSMSCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  private async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const hashedCode = this.hashBackupCode(code);
    
    const mfaConfig = await prisma.mFAConfiguration.findUnique({
      where: { userId }
    });

    if (!mfaConfig || !mfaConfig.backupCodes.includes(hashedCode)) {
      return false;
    }

    // Remove used backup code
    const updatedCodes = mfaConfig.backupCodes.filter(c => c !== hashedCode);
    await prisma.mFAConfiguration.update({
      where: { userId },
      data: {
        backupCodes: updatedCodes,
        backupCodesCount: updatedCodes.length
      }
    });

    return true;
  }

  private encrypt(text: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private async logMFAEvent(userId: string, action: string, details: string, ipAddress?: string): Promise<void> {
    await prisma.sMSAuditLog.create({
      data: {
        userId,
        action,
        entityType: 'MFA',
        entityId: userId,
        details,
        ipAddress,
        timestamp: new Date()
      }
    });
  }
}

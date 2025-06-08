import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import AWS from 'aws-sdk';
import { logger } from '../utils/logger';
import { EmailService } from './emailService';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

export interface BackupConfig {
  type: 'FULL' | 'INCREMENTAL' | 'DIFFERENTIAL';
  schedule: string; // Cron expression
  retention: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
  storage: {
    local: boolean;
    s3?: {
      bucket: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
    };
    azure?: {
      connectionString: string;
      containerName: string;
    };
  };
  encryption: {
    enabled: boolean;
    algorithm: string;
    key: string;
  };
  compression: {
    enabled: boolean;
    level: number;
  };
}

export interface BackupMetadata {
  id: string;
  type: 'FULL' | 'INCREMENTAL' | 'DIFFERENTIAL';
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  size: number;
  location: string;
  checksum: string;
  error?: string;
  metadata: {
    databaseSize: number;
    fileCount: number;
    compressedSize: number;
    encryptionUsed: boolean;
  };
}

export interface RestoreOptions {
  backupId: string;
  targetTime?: Date;
  includeFiles: boolean;
  includeDatabase: boolean;
  dryRun: boolean;
  overwriteExisting: boolean;
}

class BackupService {
  private emailService: EmailService;
  private s3: AWS.S3 | null = null;
  private backupConfig: BackupConfig;

  constructor() {
    this.emailService = new EmailService();
    this.backupConfig = this.loadBackupConfig();
    this.initializeStorageProviders();
  }

  private loadBackupConfig(): BackupConfig {
    return {
      type: 'FULL',
      schedule: '0 2 * * *', // Daily at 2 AM
      retention: {
        daily: 7,
        weekly: 4,
        monthly: 12,
        yearly: 5
      },
      storage: {
        local: true,
        s3: process.env.AWS_S3_BUCKET ? {
          bucket: process.env.AWS_S3_BUCKET,
          region: process.env.AWS_REGION || 'us-east-1',
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
        } : undefined
      },
      encryption: {
        enabled: true,
        algorithm: 'aes-256-gcm',
        key: process.env.BACKUP_ENCRYPTION_KEY || 'default-key-change-this'
      },
      compression: {
        enabled: true,
        level: 6
      }
    };
  }

  private initializeStorageProviders(): void {
    if (this.backupConfig.storage.s3) {
      this.s3 = new AWS.S3({
        accessKeyId: this.backupConfig.storage.s3.accessKeyId,
        secretAccessKey: this.backupConfig.storage.s3.secretAccessKey,
        region: this.backupConfig.storage.s3.region
      });
    }
  }

  /**
   * Create a full backup of the system
   */
  async createFullBackup(): Promise<BackupMetadata> {
    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date();

    logger.info(`Starting full backup: ${backupId}`);

    try {
      // Create backup record
      const backup = await prisma.backup.create({
        data: {
          id: backupId,
          type: 'FULL',
          status: 'RUNNING',
          startTime,
          size: 0,
          location: '',
          checksum: '',
          metadata: {}
        }
      });

      // Create backup directory
      const backupDir = path.join(process.cwd(), 'backups', backupId);
      await fs.mkdir(backupDir, { recursive: true });

      // Backup database
      const dbBackupPath = await this.backupDatabase(backupDir);
      const dbSize = (await fs.stat(dbBackupPath)).size;

      // Backup files
      const filesBackupPath = await this.backupFiles(backupDir);
      const filesSize = (await fs.stat(filesBackupPath)).size;

      // Create archive
      const archivePath = await this.createArchive(backupDir, backupId);
      const archiveSize = (await fs.stat(archivePath)).size;

      // Calculate checksum
      const checksum = await this.calculateChecksum(archivePath);

      // Upload to cloud storage if configured
      let cloudLocation = '';
      if (this.backupConfig.storage.s3) {
        cloudLocation = await this.uploadToS3(archivePath, backupId);
      }

      // Update backup record
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const updatedBackup = await prisma.backup.update({
        where: { id: backupId },
        data: {
          status: 'COMPLETED',
          endTime,
          duration,
          size: archiveSize,
          location: cloudLocation || archivePath,
          checksum,
          metadata: {
            databaseSize: dbSize,
            fileCount: await this.countFiles(backupDir),
            compressedSize: archiveSize,
            encryptionUsed: this.backupConfig.encryption.enabled
          }
        }
      });

      // Clean up local files if uploaded to cloud
      if (cloudLocation && !this.backupConfig.storage.local) {
        await fs.rm(backupDir, { recursive: true });
      }

      // Send notification
      await this.sendBackupNotification(updatedBackup, 'SUCCESS');

      logger.info(`Full backup completed: ${backupId}`, {
        duration,
        size: archiveSize,
        location: updatedBackup.location
      });

      return updatedBackup as BackupMetadata;
    } catch (error) {
      logger.error(`Backup failed: ${backupId}`, error);

      // Update backup record with error
      await prisma.backup.update({
        where: { id: backupId },
        data: {
          status: 'FAILED',
          endTime: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      // Send failure notification
      await this.sendBackupNotification({ id: backupId } as any, 'FAILURE', error);

      throw error;
    }
  }

  /**
   * Backup database using pg_dump
   */
  private async backupDatabase(backupDir: string): Promise<string> {
    const dbUrl = process.env.DATABASE_URL!;
    const backupPath = path.join(backupDir, 'database.sql');

    logger.info('Starting database backup');

    try {
      const command = `pg_dump "${dbUrl}" --no-password --verbose --clean --no-acl --no-owner -f "${backupPath}"`;
      await execAsync(command);

      logger.info('Database backup completed', { path: backupPath });
      return backupPath;
    } catch (error) {
      logger.error('Database backup failed', error);
      throw new Error(`Database backup failed: ${error}`);
    }
  }

  /**
   * Backup uploaded files and documents
   */
  private async backupFiles(backupDir: string): Promise<string> {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const filesBackupPath = path.join(backupDir, 'files.tar.gz');

    logger.info('Starting files backup');

    try {
      // Check if uploads directory exists
      try {
        await fs.access(uploadsDir);
      } catch {
        // Create empty archive if no uploads directory
        await fs.writeFile(filesBackupPath, '');
        return filesBackupPath;
      }

      const command = `tar -czf "${filesBackupPath}" -C "${uploadsDir}" .`;
      await execAsync(command);

      logger.info('Files backup completed', { path: filesBackupPath });
      return filesBackupPath;
    } catch (error) {
      logger.error('Files backup failed', error);
      throw new Error(`Files backup failed: ${error}`);
    }
  }

  /**
   * Create compressed archive of backup
   */
  private async createArchive(backupDir: string, backupId: string): Promise<string> {
    const archivePath = path.join(path.dirname(backupDir), `${backupId}.tar.gz`);

    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(archivePath);
      const archive = archiver('tar', {
        gzip: true,
        gzipOptions: {
          level: this.backupConfig.compression.level
        }
      });

      output.on('close', () => {
        logger.info(`Archive created: ${archivePath}`, { size: archive.pointer() });
        resolve(archivePath);
      });

      archive.on('error', (err) => {
        logger.error('Archive creation failed', err);
        reject(err);
      });

      archive.pipe(output);
      archive.directory(backupDir, false);
      archive.finalize();
    });
  }

  /**
   * Calculate file checksum for integrity verification
   */
  private async calculateChecksum(filePath: string): Promise<string> {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    const stream = require('fs').createReadStream(filePath);

    return new Promise((resolve, reject) => {
      stream.on('data', (data: Buffer) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Upload backup to AWS S3
   */
  private async uploadToS3(filePath: string, backupId: string): Promise<string> {
    if (!this.s3 || !this.backupConfig.storage.s3) {
      throw new Error('S3 not configured');
    }

    const fileStream = require('fs').createReadStream(filePath);
    const key = `backups/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${backupId}.tar.gz`;

    logger.info(`Uploading backup to S3: ${key}`);

    try {
      const result = await this.s3.upload({
        Bucket: this.backupConfig.storage.s3.bucket,
        Key: key,
        Body: fileStream,
        ServerSideEncryption: 'AES256',
        StorageClass: 'STANDARD_IA'
      }).promise();

      logger.info(`Backup uploaded to S3: ${result.Location}`);
      return result.Location;
    } catch (error) {
      logger.error('S3 upload failed', error);
      throw error;
    }
  }

  /**
   * Restore system from backup
   */
  async restoreFromBackup(options: RestoreOptions): Promise<void> {
    logger.info(`Starting restore from backup: ${options.backupId}`);

    try {
      // Get backup metadata
      const backup = await prisma.backup.findUnique({
        where: { id: options.backupId }
      });

      if (!backup) {
        throw new Error(`Backup not found: ${options.backupId}`);
      }

      if (backup.status !== 'COMPLETED') {
        throw new Error(`Backup is not in completed state: ${backup.status}`);
      }

      // Download backup if stored in cloud
      let backupPath = backup.location;
      if (backup.location.startsWith('http')) {
        backupPath = await this.downloadBackup(backup.location, options.backupId);
      }

      // Verify backup integrity
      const isValid = await this.verifyBackupIntegrity(backupPath, backup.checksum);
      if (!isValid) {
        throw new Error('Backup integrity check failed');
      }

      // Extract backup
      const extractDir = await this.extractBackup(backupPath, options.backupId);

      if (options.dryRun) {
        logger.info('Dry run completed - no changes made');
        return;
      }

      // Restore database
      if (options.includeDatabase) {
        await this.restoreDatabase(path.join(extractDir, 'database.sql'));
      }

      // Restore files
      if (options.includeFiles) {
        await this.restoreFiles(path.join(extractDir, 'files.tar.gz'));
      }

      // Clean up
      await fs.rm(extractDir, { recursive: true });

      logger.info(`Restore completed successfully: ${options.backupId}`);
    } catch (error) {
      logger.error(`Restore failed: ${options.backupId}`, error);
      throw error;
    }
  }

  /**
   * Download backup from cloud storage
   */
  private async downloadBackup(url: string, backupId: string): Promise<string> {
    // Implementation depends on storage provider
    // For S3, extract bucket and key from URL and download
    throw new Error('Cloud backup download not implemented');
  }

  /**
   * Verify backup file integrity
   */
  private async verifyBackupIntegrity(filePath: string, expectedChecksum: string): Promise<boolean> {
    try {
      const actualChecksum = await this.calculateChecksum(filePath);
      return actualChecksum === expectedChecksum;
    } catch (error) {
      logger.error('Integrity verification failed', error);
      return false;
    }
  }

  /**
   * Extract backup archive
   */
  private async extractBackup(archivePath: string, backupId: string): Promise<string> {
    const extractDir = path.join(process.cwd(), 'temp', `restore_${backupId}`);
    await fs.mkdir(extractDir, { recursive: true });

    try {
      const command = `tar -xzf "${archivePath}" -C "${extractDir}"`;
      await execAsync(command);
      return extractDir;
    } catch (error) {
      logger.error('Backup extraction failed', error);
      throw error;
    }
  }

  /**
   * Restore database from SQL dump
   */
  private async restoreDatabase(sqlPath: string): Promise<void> {
    const dbUrl = process.env.DATABASE_URL!;

    logger.info('Starting database restore');

    try {
      const command = `psql "${dbUrl}" -f "${sqlPath}"`;
      await execAsync(command);
      logger.info('Database restore completed');
    } catch (error) {
      logger.error('Database restore failed', error);
      throw error;
    }
  }

  /**
   * Restore files from archive
   */
  private async restoreFiles(archivePath: string): Promise<void> {
    const uploadsDir = path.join(process.cwd(), 'uploads');

    logger.info('Starting files restore');

    try {
      // Backup existing files if not overwriting
      const backupUploadsDir = `${uploadsDir}_backup_${Date.now()}`;
      await fs.rename(uploadsDir, backupUploadsDir);

      // Create new uploads directory
      await fs.mkdir(uploadsDir, { recursive: true });

      // Extract files
      const command = `tar -xzf "${archivePath}" -C "${uploadsDir}"`;
      await execAsync(command);

      logger.info('Files restore completed');
    } catch (error) {
      logger.error('Files restore failed', error);
      throw error;
    }
  }

  /**
   * Clean up old backups based on retention policy
   */
  async cleanupOldBackups(): Promise<void> {
    logger.info('Starting backup cleanup');

    try {
      const now = new Date();
      const retention = this.backupConfig.retention;

      // Calculate cutoff dates
      const dailyCutoff = new Date(now.getTime() - retention.daily * 24 * 60 * 60 * 1000);
      const weeklyCutoff = new Date(now.getTime() - retention.weekly * 7 * 24 * 60 * 60 * 1000);
      const monthlyCutoff = new Date(now.getTime() - retention.monthly * 30 * 24 * 60 * 60 * 1000);
      const yearlyCutoff = new Date(now.getTime() - retention.yearly * 365 * 24 * 60 * 60 * 1000);

      // Find backups to delete
      const backupsToDelete = await prisma.backup.findMany({
        where: {
          AND: [
            { status: 'COMPLETED' },
            { startTime: { lt: dailyCutoff } }
          ]
        }
      });

      // Delete old backups
      for (const backup of backupsToDelete) {
        await this.deleteBackup(backup.id);
      }

      logger.info(`Cleanup completed - deleted ${backupsToDelete.length} old backups`);
    } catch (error) {
      logger.error('Backup cleanup failed', error);
      throw error;
    }
  }

  /**
   * Delete a specific backup
   */
  private async deleteBackup(backupId: string): Promise<void> {
    try {
      const backup = await prisma.backup.findUnique({
        where: { id: backupId }
      });

      if (!backup) return;

      // Delete from cloud storage
      if (backup.location.startsWith('http') && this.s3) {
        // Extract S3 key from URL and delete
        const key = backup.location.split('/').slice(-3).join('/');
        await this.s3.deleteObject({
          Bucket: this.backupConfig.storage.s3!.bucket,
          Key: key
        }).promise();
      }

      // Delete local file
      if (!backup.location.startsWith('http')) {
        try {
          await fs.unlink(backup.location);
        } catch (error) {
          // File might not exist, continue
        }
      }

      // Delete database record
      await prisma.backup.delete({
        where: { id: backupId }
      });

      logger.info(`Backup deleted: ${backupId}`);
    } catch (error) {
      logger.error(`Failed to delete backup: ${backupId}`, error);
    }
  }

  /**
   * Get backup statistics
   */
  async getBackupStats(): Promise<any> {
    const stats = await prisma.backup.aggregate({
      _count: {
        id: true
      },
      _sum: {
        size: true
      },
      _avg: {
        duration: true
      }
    });

    const recentBackups = await prisma.backup.findMany({
      take: 10,
      orderBy: { startTime: 'desc' },
      select: {
        id: true,
        type: true,
        status: true,
        startTime: true,
        duration: true,
        size: true
      }
    });

    return {
      totalBackups: stats._count.id,
      totalSize: stats._sum.size || 0,
      averageDuration: stats._avg.duration || 0,
      recentBackups
    };
  }

  private async countFiles(directory: string): Promise<number> {
    try {
      const { stdout } = await execAsync(`find "${directory}" -type f | wc -l`);
      return parseInt(stdout.trim());
    } catch {
      return 0;
    }
  }

  private async sendBackupNotification(backup: any, status: 'SUCCESS' | 'FAILURE', error?: any): Promise<void> {
    const subject = `SMS Backup ${status}: ${backup.id}`;
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@company.com';

    let html = `
      <h2>SMS System Backup ${status}</h2>
      <p><strong>Backup ID:</strong> ${backup.id}</p>
      <p><strong>Status:</strong> ${status}</p>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
    `;

    if (status === 'SUCCESS') {
      html += `
        <p><strong>Duration:</strong> ${backup.duration}ms</p>
        <p><strong>Size:</strong> ${backup.size} bytes</p>
        <p><strong>Location:</strong> ${backup.location}</p>
      `;
    } else {
      html += `
        <p><strong>Error:</strong> ${error?.message || 'Unknown error'}</p>
      `;
    }

    try {
      await this.emailService.sendEmail({
        to: adminEmail,
        subject,
        html
      });
    } catch (emailError) {
      logger.error('Failed to send backup notification email', emailError);
    }
  }
}

export default new BackupService();

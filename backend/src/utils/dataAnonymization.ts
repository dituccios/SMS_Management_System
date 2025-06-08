import crypto from 'crypto';
import { faker } from '@faker-js/faker';
import { logger } from './logger';

export interface AnonymizationOptions {
  method: 'ANONYMIZATION' | 'PSEUDONYMIZATION';
  preserveFormat?: boolean;
  preserveLength?: boolean;
  seed?: string;
  customMappings?: Record<string, string>;
}

export interface AnonymizationResult {
  originalValue: string;
  anonymizedValue: string;
  method: string;
  preservationKey?: string;
  timestamp: Date;
}

export interface PseudonymizationKey {
  id: string;
  algorithm: string;
  key: string;
  salt: string;
  createdAt: Date;
  expiresAt?: Date;
}

export class DataAnonymizationService {
  private encryptionKey: string;
  private pseudonymizationKeys: Map<string, PseudonymizationKey> = new Map();

  constructor() {
    this.encryptionKey = process.env.ANONYMIZATION_KEY || 'default-anonymization-key-change-this';
  }

  /**
   * Anonymize personal data - irreversible process
   */
  async anonymizePersonalData(data: any, options: AnonymizationOptions = { method: 'ANONYMIZATION' }): Promise<any> {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const anonymizedData = { ...data };
    
    // Set faker seed for consistent anonymization if provided
    if (options.seed) {
      faker.seed(parseInt(options.seed));
    }

    // Anonymize specific fields
    const fieldMappings = {
      // Personal identifiers
      firstName: () => this.anonymizeFirstName(data.firstName, options),
      lastName: () => this.anonymizeLastName(data.lastName, options),
      email: () => this.anonymizeEmail(data.email, options),
      phoneNumber: () => this.anonymizePhoneNumber(data.phoneNumber, options),
      
      // Sensitive personal data
      dateOfBirth: () => this.anonymizeDateOfBirth(data.dateOfBirth, options),
      nationalId: () => this.anonymizeNationalId(data.nationalId, options),
      address: () => this.anonymizeAddress(data.address, options),
      emergencyContact: () => this.anonymizeEmergencyContact(data.emergencyContact, options),
      
      // Employment data
      employeeId: () => this.anonymizeEmployeeId(data.employeeId, options),
      
      // Custom fields
      ...options.customMappings
    };

    for (const [field, anonymizer] of Object.entries(fieldMappings)) {
      if (anonymizedData[field] !== undefined && anonymizedData[field] !== null) {
        try {
          anonymizedData[field] = await anonymizer();
        } catch (error) {
          logger.error(`Failed to anonymize field ${field}:`, error);
          // Fallback to generic anonymization
          anonymizedData[field] = this.genericAnonymization(anonymizedData[field], options);
        }
      }
    }

    return anonymizedData;
  }

  /**
   * Pseudonymize personal data - reversible with key
   */
  async pseudonymizePersonalData(data: any, keyId: string, options: AnonymizationOptions = { method: 'PSEUDONYMIZATION' }): Promise<any> {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const pseudonymizedData = { ...data };
    const key = await this.getPseudonymizationKey(keyId);

    if (!key) {
      throw new Error(`Pseudonymization key not found: ${keyId}`);
    }

    // Pseudonymize specific fields
    const sensitiveFields = [
      'firstName', 'lastName', 'email', 'phoneNumber',
      'dateOfBirth', 'nationalId', 'address', 'emergencyContact'
    ];

    for (const field of sensitiveFields) {
      if (pseudonymizedData[field] !== undefined && pseudonymizedData[field] !== null) {
        pseudonymizedData[field] = this.pseudonymizeValue(pseudonymizedData[field], key, options);
      }
    }

    return pseudonymizedData;
  }

  /**
   * Reverse pseudonymization to get original data
   */
  async depseudonymizePersonalData(data: any, keyId: string): Promise<any> {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const depseudonymizedData = { ...data };
    const key = await this.getPseudonymizationKey(keyId);

    if (!key) {
      throw new Error(`Pseudonymization key not found: ${keyId}`);
    }

    const sensitiveFields = [
      'firstName', 'lastName', 'email', 'phoneNumber',
      'dateOfBirth', 'nationalId', 'address', 'emergencyContact'
    ];

    for (const field of sensitiveFields) {
      if (depseudonymizedData[field] !== undefined && depseudonymizedData[field] !== null) {
        try {
          depseudonymizedData[field] = this.depseudonymizeValue(depseudonymizedData[field], key);
        } catch (error) {
          logger.error(`Failed to depseudonymize field ${field}:`, error);
          // Keep pseudonymized value if decryption fails
        }
      }
    }

    return depseudonymizedData;
  }

  // Field-specific anonymization methods
  private anonymizeFirstName(firstName: string, options: AnonymizationOptions): string {
    if (!firstName) return firstName;
    
    if (options.preserveFormat) {
      // Preserve first letter and length
      const firstLetter = firstName.charAt(0);
      const restLength = firstName.length - 1;
      return firstLetter + 'x'.repeat(restLength);
    }
    
    return faker.person.firstName();
  }

  private anonymizeLastName(lastName: string, options: AnonymizationOptions): string {
    if (!lastName) return lastName;
    
    if (options.preserveFormat) {
      const firstLetter = lastName.charAt(0);
      const restLength = lastName.length - 1;
      return firstLetter + 'x'.repeat(restLength);
    }
    
    return faker.person.lastName();
  }

  private anonymizeEmail(email: string, options: AnonymizationOptions): string {
    if (!email) return email;
    
    if (options.preserveFormat) {
      const [localPart, domain] = email.split('@');
      const anonymizedLocal = localPart.charAt(0) + 'x'.repeat(localPart.length - 1);
      return `${anonymizedLocal}@${domain}`;
    }
    
    return faker.internet.email();
  }

  private anonymizePhoneNumber(phoneNumber: string, options: AnonymizationOptions): string {
    if (!phoneNumber) return phoneNumber;
    
    if (options.preserveFormat) {
      // Preserve format but replace digits
      return phoneNumber.replace(/\d/g, 'X');
    }
    
    return faker.phone.number();
  }

  private anonymizeDateOfBirth(dateOfBirth: string | Date, options: AnonymizationOptions): string {
    if (!dateOfBirth) return dateOfBirth as string;
    
    const date = new Date(dateOfBirth);
    
    if (options.preserveFormat) {
      // Preserve year, anonymize month and day
      const year = date.getFullYear();
      const anonymizedDate = new Date(year, 5, 15); // June 15th
      return anonymizedDate.toISOString();
    }
    
    // Generate random date within reasonable age range (18-80 years)
    const minAge = 18;
    const maxAge = 80;
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - faker.number.int({ min: minAge, max: maxAge });
    
    return faker.date.birthdate({ min: birthYear, max: birthYear, mode: 'year' }).toISOString();
  }

  private anonymizeNationalId(nationalId: string, options: AnonymizationOptions): string {
    if (!nationalId) return nationalId;
    
    if (options.preserveFormat) {
      // Preserve format but replace digits
      return nationalId.replace(/\d/g, 'X');
    }
    
    // Generate random ID with same length
    const length = nationalId.length;
    return faker.string.numeric(length);
  }

  private anonymizeAddress(address: any, options: AnonymizationOptions): any {
    if (!address) return address;
    
    if (typeof address === 'string') {
      return faker.location.streetAddress();
    }
    
    if (typeof address === 'object') {
      return {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        postalCode: faker.location.zipCode(),
        country: address.country || faker.location.country()
      };
    }
    
    return address;
  }

  private anonymizeEmergencyContact(contact: any, options: AnonymizationOptions): any {
    if (!contact) return contact;
    
    if (typeof contact === 'object') {
      return {
        name: faker.person.fullName(),
        relationship: contact.relationship || 'Contact',
        phoneNumber: faker.phone.number(),
        email: faker.internet.email()
      };
    }
    
    return contact;
  }

  private anonymizeEmployeeId(employeeId: string, options: AnonymizationOptions): string {
    if (!employeeId) return employeeId;
    
    if (options.preserveFormat) {
      // Preserve format but replace with random characters
      return employeeId.replace(/[a-zA-Z]/g, 'X').replace(/\d/g, '0');
    }
    
    // Generate random employee ID with same length
    const length = employeeId.length;
    return 'EMP' + faker.string.alphanumeric(length - 3).toUpperCase();
  }

  private genericAnonymization(value: any, options: AnonymizationOptions): any {
    if (typeof value === 'string') {
      if (options.preserveLength) {
        return 'X'.repeat(value.length);
      }
      return 'ANONYMIZED';
    }
    
    if (typeof value === 'number') {
      return 0;
    }
    
    if (typeof value === 'boolean') {
      return false;
    }
    
    return value;
  }

  // Pseudonymization methods
  private pseudonymizeValue(value: string, key: PseudonymizationKey, options: AnonymizationOptions): string {
    const cipher = crypto.createCipher(key.algorithm, key.key + key.salt);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private depseudonymizeValue(encryptedValue: string, key: PseudonymizationKey): string {
    const decipher = crypto.createDecipher(key.algorithm, key.key + key.salt);
    let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Key management
  async createPseudonymizationKey(keyId: string, expiresAt?: Date): Promise<PseudonymizationKey> {
    const key: PseudonymizationKey = {
      id: keyId,
      algorithm: 'aes-256-cbc',
      key: crypto.randomBytes(32).toString('hex'),
      salt: crypto.randomBytes(16).toString('hex'),
      createdAt: new Date(),
      expiresAt
    };

    this.pseudonymizationKeys.set(keyId, key);
    
    // In production, store this securely in a key management system
    logger.info(`Created pseudonymization key: ${keyId}`);
    
    return key;
  }

  async getPseudonymizationKey(keyId: string): Promise<PseudonymizationKey | null> {
    const key = this.pseudonymizationKeys.get(keyId);
    
    if (!key) {
      return null;
    }
    
    // Check if key is expired
    if (key.expiresAt && new Date() > key.expiresAt) {
      this.pseudonymizationKeys.delete(keyId);
      return null;
    }
    
    return key;
  }

  async deletePseudonymizationKey(keyId: string): Promise<boolean> {
    return this.pseudonymizationKeys.delete(keyId);
  }

  // Utility methods
  generateAnonymizationHash(data: any): string {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  validateAnonymization(originalData: any, anonymizedData: any): boolean {
    // Check that no original sensitive data remains
    const sensitiveFields = [
      'firstName', 'lastName', 'email', 'phoneNumber',
      'dateOfBirth', 'nationalId'
    ];

    for (const field of sensitiveFields) {
      if (originalData[field] && anonymizedData[field] === originalData[field]) {
        return false; // Original data still present
      }
    }

    return true;
  }

  // Data masking for display purposes
  maskSensitiveData(data: any, maskingLevel: 'PARTIAL' | 'FULL' = 'PARTIAL'): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const maskedData = { ...data };

    if (maskingLevel === 'PARTIAL') {
      // Partial masking - show first/last characters
      if (maskedData.email) {
        const [local, domain] = maskedData.email.split('@');
        maskedData.email = `${local.charAt(0)}***${local.slice(-1)}@${domain}`;
      }
      
      if (maskedData.phoneNumber) {
        const phone = maskedData.phoneNumber.replace(/\D/g, '');
        maskedData.phoneNumber = `***-***-${phone.slice(-4)}`;
      }
      
      if (maskedData.nationalId) {
        maskedData.nationalId = `***-**-${maskedData.nationalId.slice(-4)}`;
      }
    } else {
      // Full masking
      const fieldsToMask = ['email', 'phoneNumber', 'nationalId', 'address'];
      fieldsToMask.forEach(field => {
        if (maskedData[field]) {
          maskedData[field] = '***MASKED***';
        }
      });
    }

    return maskedData;
  }
}

export default new DataAnonymizationService();

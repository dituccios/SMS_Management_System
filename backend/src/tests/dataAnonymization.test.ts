import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import dataAnonymizationService from '../utils/dataAnonymization';

describe('DataAnonymizationService', () => {
  const testPersonalData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phoneNumber: '+1-555-123-4567',
    dateOfBirth: '1990-05-15',
    nationalId: '123-45-6789',
    employeeId: 'EMP001',
    address: {
      street: '123 Main Street',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'USA'
    },
    emergencyContact: {
      name: 'Jane Doe',
      relationship: 'Spouse',
      phoneNumber: '+1-555-987-6543',
      email: 'jane.doe@example.com'
    }
  };

  beforeEach(() => {
    // Reset any state before each test
  });

  afterEach(() => {
    // Clean up after each test
  });

  describe('anonymizePersonalData', () => {
    it('should anonymize all personal data fields', async () => {
      const anonymizedData = await dataAnonymizationService.anonymizePersonalData(testPersonalData);

      expect(anonymizedData.firstName).not.toBe(testPersonalData.firstName);
      expect(anonymizedData.lastName).not.toBe(testPersonalData.lastName);
      expect(anonymizedData.email).not.toBe(testPersonalData.email);
      expect(anonymizedData.phoneNumber).not.toBe(testPersonalData.phoneNumber);
      expect(anonymizedData.nationalId).not.toBe(testPersonalData.nationalId);
      expect(anonymizedData.employeeId).not.toBe(testPersonalData.employeeId);
    });

    it('should preserve data format when preserveFormat option is true', async () => {
      const anonymizedData = await dataAnonymizationService.anonymizePersonalData(
        testPersonalData,
        { method: 'ANONYMIZATION', preserveFormat: true }
      );

      // Email should preserve @ symbol and domain structure
      expect(anonymizedData.email).toMatch(/@/);
      
      // Phone number should preserve format structure
      expect(anonymizedData.phoneNumber).toMatch(/X/);
      
      // National ID should preserve format
      expect(anonymizedData.nationalId).toMatch(/X/);
    });

    it('should handle null and undefined values gracefully', async () => {
      const dataWithNulls = {
        ...testPersonalData,
        phoneNumber: null,
        dateOfBirth: undefined,
        address: null
      };

      const anonymizedData = await dataAnonymizationService.anonymizePersonalData(dataWithNulls);

      expect(anonymizedData.phoneNumber).toBeNull();
      expect(anonymizedData.dateOfBirth).toBeUndefined();
      expect(anonymizedData.address).toBeNull();
    });

    it('should use custom mappings when provided', async () => {
      const customMappings = {
        firstName: () => 'CustomFirstName'
      };

      const anonymizedData = await dataAnonymizationService.anonymizePersonalData(
        testPersonalData,
        { method: 'ANONYMIZATION', customMappings }
      );

      expect(anonymizedData.firstName).toBe('CustomFirstName');
    });

    it('should generate consistent results with same seed', async () => {
      const seed = '12345';
      
      const anonymizedData1 = await dataAnonymizationService.anonymizePersonalData(
        testPersonalData,
        { method: 'ANONYMIZATION', seed }
      );

      const anonymizedData2 = await dataAnonymizationService.anonymizePersonalData(
        testPersonalData,
        { method: 'ANONYMIZATION', seed }
      );

      expect(anonymizedData1.firstName).toBe(anonymizedData2.firstName);
      expect(anonymizedData1.lastName).toBe(anonymizedData2.lastName);
      expect(anonymizedData1.email).toBe(anonymizedData2.email);
    });
  });

  describe('pseudonymizePersonalData', () => {
    let keyId: string;

    beforeEach(async () => {
      keyId = 'test-key-' + Date.now();
      await dataAnonymizationService.createPseudonymizationKey(keyId);
    });

    afterEach(async () => {
      await dataAnonymizationService.deletePseudonymizationKey(keyId);
    });

    it('should pseudonymize and depseudonymize data correctly', async () => {
      const pseudonymizedData = await dataAnonymizationService.pseudonymizePersonalData(
        testPersonalData,
        keyId
      );

      // Data should be different after pseudonymization
      expect(pseudonymizedData.firstName).not.toBe(testPersonalData.firstName);
      expect(pseudonymizedData.email).not.toBe(testPersonalData.email);

      // Should be able to reverse the process
      const depseudonymizedData = await dataAnonymizationService.depseudonymizePersonalData(
        pseudonymizedData,
        keyId
      );

      expect(depseudonymizedData.firstName).toBe(testPersonalData.firstName);
      expect(depseudonymizedData.lastName).toBe(testPersonalData.lastName);
      expect(depseudonymizedData.email).toBe(testPersonalData.email);
      expect(depseudonymizedData.phoneNumber).toBe(testPersonalData.phoneNumber);
    });

    it('should throw error with invalid key', async () => {
      await expect(
        dataAnonymizationService.pseudonymizePersonalData(testPersonalData, 'invalid-key')
      ).rejects.toThrow('Pseudonymization key not found');
    });

    it('should handle expired keys', async () => {
      const expiredKeyId = 'expired-key-' + Date.now();
      const pastDate = new Date(Date.now() - 1000); // 1 second ago
      
      await dataAnonymizationService.createPseudonymizationKey(expiredKeyId, pastDate);

      await expect(
        dataAnonymizationService.pseudonymizePersonalData(testPersonalData, expiredKeyId)
      ).rejects.toThrow('Pseudonymization key not found');
    });
  });

  describe('validateAnonymization', () => {
    it('should return false if original data is still present', async () => {
      const fakeAnonymizedData = { ...testPersonalData }; // No actual anonymization

      const isValid = dataAnonymizationService.validateAnonymization(
        testPersonalData,
        fakeAnonymizedData
      );

      expect(isValid).toBe(false);
    });

    it('should return true if data is properly anonymized', async () => {
      const anonymizedData = await dataAnonymizationService.anonymizePersonalData(testPersonalData);

      const isValid = dataAnonymizationService.validateAnonymization(
        testPersonalData,
        anonymizedData
      );

      expect(isValid).toBe(true);
    });
  });

  describe('maskSensitiveData', () => {
    it('should partially mask data by default', () => {
      const maskedData = dataAnonymizationService.maskSensitiveData(testPersonalData);

      expect(maskedData.email).toMatch(/^j\*\*\*e@example\.com$/);
      expect(maskedData.phoneNumber).toMatch(/\*\*\*-\*\*\*-4567$/);
    });

    it('should fully mask data when specified', () => {
      const maskedData = dataAnonymizationService.maskSensitiveData(testPersonalData, 'FULL');

      expect(maskedData.email).toBe('***MASKED***');
      expect(maskedData.phoneNumber).toBe('***MASKED***');
      expect(maskedData.nationalId).toBe('***MASKED***');
    });

    it('should handle null and undefined values', () => {
      const dataWithNulls = {
        email: null,
        phoneNumber: undefined,
        nationalId: ''
      };

      const maskedData = dataAnonymizationService.maskSensitiveData(dataWithNulls);

      expect(maskedData.email).toBeNull();
      expect(maskedData.phoneNumber).toBeUndefined();
      expect(maskedData.nationalId).toBe('');
    });
  });

  describe('generateAnonymizationHash', () => {
    it('should generate consistent hash for same data', () => {
      const hash1 = dataAnonymizationService.generateAnonymizationHash(testPersonalData);
      const hash2 = dataAnonymizationService.generateAnonymizationHash(testPersonalData);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hash format
    });

    it('should generate different hash for different data', () => {
      const modifiedData = { ...testPersonalData, firstName: 'Jane' };
      
      const hash1 = dataAnonymizationService.generateAnonymizationHash(testPersonalData);
      const hash2 = dataAnonymizationService.generateAnonymizationHash(modifiedData);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('key management', () => {
    it('should create and retrieve pseudonymization keys', async () => {
      const keyId = 'test-key-management-' + Date.now();
      
      const createdKey = await dataAnonymizationService.createPseudonymizationKey(keyId);
      expect(createdKey.id).toBe(keyId);
      expect(createdKey.algorithm).toBe('aes-256-cbc');
      expect(createdKey.key).toBeDefined();
      expect(createdKey.salt).toBeDefined();

      const retrievedKey = await dataAnonymizationService.getPseudonymizationKey(keyId);
      expect(retrievedKey).toEqual(createdKey);

      const deleted = await dataAnonymizationService.deletePseudonymizationKey(keyId);
      expect(deleted).toBe(true);

      const deletedKey = await dataAnonymizationService.getPseudonymizationKey(keyId);
      expect(deletedKey).toBeNull();
    });

    it('should handle key expiration', async () => {
      const keyId = 'test-expiry-' + Date.now();
      const expiryDate = new Date(Date.now() + 1000); // 1 second from now
      
      await dataAnonymizationService.createPseudonymizationKey(keyId, expiryDate);
      
      // Key should exist initially
      let key = await dataAnonymizationService.getPseudonymizationKey(keyId);
      expect(key).not.toBeNull();

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Key should be expired and return null
      key = await dataAnonymizationService.getPseudonymizationKey(keyId);
      expect(key).toBeNull();
    });
  });

  describe('field-specific anonymization', () => {
    it('should anonymize email addresses correctly', async () => {
      const emails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'simple@test.org'
      ];

      for (const email of emails) {
        const data = { email };
        const anonymized = await dataAnonymizationService.anonymizePersonalData(data);
        
        expect(anonymized.email).not.toBe(email);
        expect(anonymized.email).toMatch(/@/); // Should still contain @
      }
    });

    it('should anonymize phone numbers correctly', async () => {
      const phoneNumbers = [
        '+1-555-123-4567',
        '(555) 123-4567',
        '555.123.4567',
        '5551234567'
      ];

      for (const phoneNumber of phoneNumbers) {
        const data = { phoneNumber };
        const anonymized = await dataAnonymizationService.anonymizePersonalData(data);
        
        expect(anonymized.phoneNumber).not.toBe(phoneNumber);
      }
    });

    it('should anonymize dates of birth appropriately', async () => {
      const dates = [
        '1990-05-15',
        new Date('1985-12-25'),
        '2000-01-01'
      ];

      for (const dateOfBirth of dates) {
        const data = { dateOfBirth };
        const anonymized = await dataAnonymizationService.anonymizePersonalData(data);
        
        expect(anonymized.dateOfBirth).not.toBe(dateOfBirth);
        
        // Should still be a valid date
        const anonymizedDate = new Date(anonymized.dateOfBirth);
        expect(anonymizedDate).toBeInstanceOf(Date);
        expect(isNaN(anonymizedDate.getTime())).toBe(false);
      }
    });

    it('should anonymize addresses correctly', async () => {
      const addresses = [
        '123 Main Street',
        {
          street: '456 Oak Avenue',
          city: 'Springfield',
          state: 'IL',
          postalCode: '62701',
          country: 'USA'
        }
      ];

      for (const address of addresses) {
        const data = { address };
        const anonymized = await dataAnonymizationService.anonymizePersonalData(data);
        
        expect(anonymized.address).not.toEqual(address);
      }
    });
  });

  describe('error handling', () => {
    it('should handle invalid input gracefully', async () => {
      const invalidInputs = [null, undefined, '', 123, []];

      for (const input of invalidInputs) {
        const result = await dataAnonymizationService.anonymizePersonalData(input);
        expect(result).toBe(input); // Should return input unchanged for invalid types
      }
    });

    it('should handle missing fields gracefully', async () => {
      const incompleteData = {
        firstName: 'John'
        // Missing other fields
      };

      const anonymized = await dataAnonymizationService.anonymizePersonalData(incompleteData);
      
      expect(anonymized.firstName).not.toBe(incompleteData.firstName);
      expect(anonymized.lastName).toBeUndefined();
      expect(anonymized.email).toBeUndefined();
    });
  });
});

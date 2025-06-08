import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import dataAnonymizationService from '../utils/dataAnonymization';

const prisma = new PrismaClient();

export interface FieldDefinitionData {
  name: string;
  label: string;
  description?: string;
  category: string;
  fieldType: string;
  dataType: string;
  isRequired?: boolean;
  isEncrypted?: boolean;
  isSearchable?: boolean;
  isFilterable?: boolean;
  isSortable?: boolean;
  validationRules?: any;
  defaultValue?: string;
  placeholder?: string;
  helpText?: string;
  displayOrder?: number;
  isVisible?: boolean;
  isEditable?: boolean;
  groupName?: string;
  options?: any;
  conditionalLogic?: any;
  dependencies?: string[];
  isPersonalData?: boolean;
  gdprCategory?: string;
  retentionPeriod?: number;
  companyId?: string;
}

export interface FieldValueData {
  fieldDefinitionId: string;
  entityType: string;
  entityId: string;
  textValue?: string;
  numberValue?: number;
  integerValue?: number;
  booleanValue?: boolean;
  dateValue?: Date;
  jsonValue?: any;
  companyId: string;
}

export interface FormTemplateData {
  name: string;
  description?: string;
  category: string;
  fields: any[];
  layout?: any;
  validationRules?: any;
  workflowId?: string;
  companyId?: string;
}

export class DynamicFieldService {
  // Field Definition Management
  async createFieldDefinition(data: FieldDefinitionData, createdBy?: string): Promise<any> {
    try {
      const fieldDefinition = await prisma.fieldDefinition.create({
        data: {
          ...data,
          createdBy,
          version: '1.0'
        }
      });

      logger.info(`Field definition created: ${fieldDefinition.id}`, {
        name: data.name,
        category: data.category,
        companyId: data.companyId
      });

      return fieldDefinition;
    } catch (error) {
      logger.error('Failed to create field definition:', error);
      throw error;
    }
  }

  async getFieldDefinitions(companyId?: string, category?: string, isActive = true): Promise<any[]> {
    try {
      const where: any = { isActive };
      
      if (companyId) {
        where.OR = [
          { companyId },
          { companyId: null } // Include global fields
        ];
      } else {
        where.companyId = null; // Only global fields
      }

      if (category) {
        where.category = category;
      }

      const fieldDefinitions = await prisma.fieldDefinition.findMany({
        where,
        orderBy: [
          { displayOrder: 'asc' },
          { createdAt: 'asc' }
        ]
      });

      return fieldDefinitions;
    } catch (error) {
      logger.error('Failed to get field definitions:', error);
      throw error;
    }
  }

  async updateFieldDefinition(id: string, data: Partial<FieldDefinitionData>, updatedBy?: string): Promise<any> {
    try {
      const updatedField = await prisma.fieldDefinition.update({
        where: { id },
        data: {
          ...data,
          updatedBy,
          version: this.incrementVersion(data.version || '1.0')
        }
      });

      logger.info(`Field definition updated: ${id}`, { updatedBy });

      return updatedField;
    } catch (error) {
      logger.error('Failed to update field definition:', error);
      throw error;
    }
  }

  async deleteFieldDefinition(id: string): Promise<void> {
    try {
      // Soft delete by setting isActive to false
      await prisma.fieldDefinition.update({
        where: { id },
        data: { isActive: false }
      });

      logger.info(`Field definition deactivated: ${id}`);
    } catch (error) {
      logger.error('Failed to delete field definition:', error);
      throw error;
    }
  }

  // Field Value Management
  async setFieldValue(data: FieldValueData, createdBy?: string): Promise<any> {
    try {
      const fieldDefinition = await prisma.fieldDefinition.findUnique({
        where: { id: data.fieldDefinitionId }
      });

      if (!fieldDefinition) {
        throw new Error('Field definition not found');
      }

      // Validate the value based on field definition
      await this.validateFieldValue(fieldDefinition, data);

      // Handle encryption if required
      let processedData = { ...data };
      if (fieldDefinition.isEncrypted) {
        processedData = await this.encryptFieldValue(processedData, fieldDefinition);
      }

      const fieldValue = await prisma.fieldValue.upsert({
        where: {
          fieldDefinitionId_entityType_entityId: {
            fieldDefinitionId: data.fieldDefinitionId,
            entityType: data.entityType as any,
            entityId: data.entityId
          }
        },
        update: {
          ...processedData,
          updatedBy: createdBy,
          version: this.incrementVersion('1.0')
        },
        create: {
          ...processedData,
          createdBy,
          version: '1.0'
        }
      });

      logger.info(`Field value set: ${fieldValue.id}`, {
        fieldDefinitionId: data.fieldDefinitionId,
        entityType: data.entityType,
        entityId: data.entityId
      });

      return fieldValue;
    } catch (error) {
      logger.error('Failed to set field value:', error);
      throw error;
    }
  }

  async getFieldValues(entityType: string, entityId: string, companyId: string): Promise<any[]> {
    try {
      const fieldValues = await prisma.fieldValue.findMany({
        where: {
          entityType: entityType as any,
          entityId,
          companyId
        },
        include: {
          fieldDefinition: true
        }
      });

      // Decrypt encrypted values
      const processedValues = await Promise.all(
        fieldValues.map(async (value) => {
          if (value.fieldDefinition.isEncrypted && value.encryptedValue) {
            return await this.decryptFieldValue(value);
          }
          return value;
        })
      );

      return processedValues;
    } catch (error) {
      logger.error('Failed to get field values:', error);
      throw error;
    }
  }

  async getFieldValuesForEntity(entityType: string, entityId: string, companyId: string): Promise<Record<string, any>> {
    try {
      const fieldValues = await this.getFieldValues(entityType, entityId, companyId);
      
      const result: Record<string, any> = {};
      
      fieldValues.forEach(value => {
        const fieldName = value.fieldDefinition.name;
        
        // Get the appropriate value based on field type
        switch (value.fieldDefinition.dataType) {
          case 'STRING':
            result[fieldName] = value.textValue;
            break;
          case 'NUMBER':
            result[fieldName] = value.numberValue;
            break;
          case 'INTEGER':
            result[fieldName] = value.integerValue;
            break;
          case 'BOOLEAN':
            result[fieldName] = value.booleanValue;
            break;
          case 'DATE':
          case 'DATETIME':
            result[fieldName] = value.dateValue;
            break;
          case 'JSON':
          case 'ARRAY':
          case 'OBJECT':
            result[fieldName] = value.jsonValue;
            break;
          default:
            result[fieldName] = value.textValue;
        }
      });

      return result;
    } catch (error) {
      logger.error('Failed to get field values for entity:', error);
      throw error;
    }
  }

  async setFieldValuesForEntity(
    entityType: string, 
    entityId: string, 
    companyId: string, 
    values: Record<string, any>,
    createdBy?: string
  ): Promise<void> {
    try {
      // Get field definitions for the company
      const fieldDefinitions = await this.getFieldDefinitions(companyId);
      
      for (const [fieldName, value] of Object.entries(values)) {
        const fieldDefinition = fieldDefinitions.find(fd => fd.name === fieldName);
        
        if (!fieldDefinition) {
          logger.warn(`Field definition not found for field: ${fieldName}`);
          continue;
        }

        // Prepare field value data based on data type
        const fieldValueData: FieldValueData = {
          fieldDefinitionId: fieldDefinition.id,
          entityType,
          entityId,
          companyId
        };

        // Set the appropriate value field based on data type
        switch (fieldDefinition.dataType) {
          case 'STRING':
          case 'EMAIL':
          case 'URL':
          case 'PHONE':
          case 'ENCRYPTED':
            fieldValueData.textValue = value?.toString();
            break;
          case 'NUMBER':
            fieldValueData.numberValue = parseFloat(value);
            break;
          case 'INTEGER':
            fieldValueData.integerValue = parseInt(value);
            break;
          case 'BOOLEAN':
            fieldValueData.booleanValue = Boolean(value);
            break;
          case 'DATE':
          case 'DATETIME':
            fieldValueData.dateValue = new Date(value);
            break;
          case 'JSON':
          case 'ARRAY':
          case 'OBJECT':
            fieldValueData.jsonValue = value;
            break;
          default:
            fieldValueData.textValue = value?.toString();
        }

        await this.setFieldValue(fieldValueData, createdBy);
      }
    } catch (error) {
      logger.error('Failed to set field values for entity:', error);
      throw error;
    }
  }

  // Form Template Management
  async createFormTemplate(data: FormTemplateData, createdBy?: string): Promise<any> {
    try {
      const formTemplate = await prisma.formTemplate.create({
        data: {
          ...data,
          createdBy,
          version: '1.0'
        }
      });

      logger.info(`Form template created: ${formTemplate.id}`, {
        name: data.name,
        category: data.category,
        companyId: data.companyId
      });

      return formTemplate;
    } catch (error) {
      logger.error('Failed to create form template:', error);
      throw error;
    }
  }

  async getFormTemplates(companyId?: string, category?: string, isActive = true): Promise<any[]> {
    try {
      const where: any = { isActive };
      
      if (companyId) {
        where.OR = [
          { companyId },
          { companyId: null } // Include global templates
        ];
      }

      if (category) {
        where.category = category;
      }

      const formTemplates = await prisma.formTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      return formTemplates;
    } catch (error) {
      logger.error('Failed to get form templates:', error);
      throw error;
    }
  }

  async publishFormTemplate(id: string, publishedBy?: string): Promise<any> {
    try {
      const formTemplate = await prisma.formTemplate.update({
        where: { id },
        data: {
          isPublished: true,
          publishedAt: new Date(),
          updatedBy: publishedBy
        }
      });

      logger.info(`Form template published: ${id}`, { publishedBy });

      return formTemplate;
    } catch (error) {
      logger.error('Failed to publish form template:', error);
      throw error;
    }
  }

  // Form Submission Management
  async submitForm(
    formTemplateId: string,
    submissionData: any,
    companyId: string,
    submittedBy?: string
  ): Promise<any> {
    try {
      const formTemplate = await prisma.formTemplate.findUnique({
        where: { id: formTemplateId }
      });

      if (!formTemplate) {
        throw new Error('Form template not found');
      }

      // Validate submission data
      const validationResult = await this.validateFormSubmission(formTemplate, submissionData);

      const formSubmission = await prisma.formSubmission.create({
        data: {
          formTemplateId,
          submissionData,
          companyId,
          submittedBy,
          isValid: validationResult.isValid,
          validationErrors: validationResult.errors
        }
      });

      // If form is linked to a workflow, create workflow instance
      if (formTemplate.workflowId) {
        await this.createWorkflowInstance(formTemplate.workflowId, formSubmission.id, companyId);
      }

      logger.info(`Form submitted: ${formSubmission.id}`, {
        formTemplateId,
        companyId,
        submittedBy
      });

      return formSubmission;
    } catch (error) {
      logger.error('Failed to submit form:', error);
      throw error;
    }
  }

  // Utility Methods
  private incrementVersion(currentVersion: string): string {
    const parts = currentVersion.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  private async validateFieldValue(fieldDefinition: any, data: FieldValueData): Promise<void> {
    // Implement field validation based on field definition
    if (fieldDefinition.isRequired) {
      const hasValue = data.textValue || data.numberValue !== undefined || 
                      data.integerValue !== undefined || data.booleanValue !== undefined ||
                      data.dateValue || data.jsonValue;
      
      if (!hasValue) {
        throw new Error(`Field ${fieldDefinition.name} is required`);
      }
    }

    // Additional validation based on validationRules
    if (fieldDefinition.validationRules) {
      // Implement custom validation logic
    }
  }

  private async encryptFieldValue(data: FieldValueData, fieldDefinition: any): Promise<FieldValueData> {
    // Implement encryption logic
    if (data.textValue) {
      const keyId = `field_${fieldDefinition.id}`;
      const encryptedValue = await dataAnonymizationService.pseudonymizePersonalData(
        { value: data.textValue },
        keyId
      );
      
      return {
        ...data,
        textValue: undefined,
        encryptedValue: encryptedValue.value,
        encryptionKey: keyId,
        isEncrypted: true
      };
    }
    
    return data;
  }

  private async decryptFieldValue(fieldValue: any): Promise<any> {
    // Implement decryption logic
    if (fieldValue.encryptedValue && fieldValue.encryptionKey) {
      const decryptedData = await dataAnonymizationService.depseudonymizePersonalData(
        { value: fieldValue.encryptedValue },
        fieldValue.encryptionKey
      );
      
      return {
        ...fieldValue,
        textValue: decryptedData.value,
        encryptedValue: undefined
      };
    }
    
    return fieldValue;
  }

  private async validateFormSubmission(formTemplate: any, submissionData: any): Promise<{ isValid: boolean; errors?: any[] }> {
    const errors: any[] = [];
    
    // Validate against form template fields
    if (formTemplate.fields) {
      for (const field of formTemplate.fields) {
        if (field.isRequired && !submissionData[field.name]) {
          errors.push({
            field: field.name,
            message: `${field.label} is required`
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private async createWorkflowInstance(workflowId: string, formSubmissionId: string, companyId: string): Promise<void> {
    try {
      await prisma.sMSWorkflowInstance.create({
        data: {
          workflowId,
          status: 'ACTIVE',
          companyId,
          formSubmissions: {
            connect: { id: formSubmissionId }
          }
        }
      });
    } catch (error) {
      logger.error('Failed to create workflow instance:', error);
    }
  }
}

export default new DynamicFieldService();

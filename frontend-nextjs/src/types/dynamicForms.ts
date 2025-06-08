// Dynamic Forms and Field Management Types

export type FieldType = 
  | 'TEXT'
  | 'TEXTAREA'
  | 'EMAIL'
  | 'PASSWORD'
  | 'URL'
  | 'PHONE'
  | 'NUMBER'
  | 'INTEGER'
  | 'DECIMAL'
  | 'BOOLEAN'
  | 'DATE'
  | 'DATETIME'
  | 'TIME'
  | 'SELECT'
  | 'MULTISELECT'
  | 'RADIO'
  | 'CHECKBOX'
  | 'FILE'
  | 'IMAGE'
  | 'JSON'
  | 'ARRAY'
  | 'OBJECT'
  | 'ENCRYPTED_TEXT'
  | 'SIGNATURE'
  | 'LOCATION'
  | 'COLOR'
  | 'RATING'
  | 'SLIDER'
  | 'RICH_TEXT'
  | 'CODE'
  | 'BARCODE'
  | 'QR_CODE';

export type DataType = 
  | 'STRING'
  | 'NUMBER'
  | 'INTEGER'
  | 'BOOLEAN'
  | 'DATE'
  | 'DATETIME'
  | 'JSON'
  | 'ARRAY'
  | 'OBJECT'
  | 'BINARY'
  | 'UUID'
  | 'EMAIL'
  | 'URL'
  | 'PHONE'
  | 'ENCRYPTED';

export type EntityType = 
  | 'PERSONA'
  | 'TRAINING_RECORD'
  | 'CERTIFICATION'
  | 'COMPETENCY'
  | 'DOCUMENT'
  | 'INCIDENT'
  | 'WORKFLOW'
  | 'WORKFLOW_TASK'
  | 'RISK_ASSESSMENT'
  | 'AUDIT_LOG'
  | 'FORM_SUBMISSION'
  | 'CUSTOM';

export type GDPRDataCategory = 
  | 'PERSONAL_IDENTIFIERS'
  | 'CONTACT_INFORMATION'
  | 'DEMOGRAPHIC_DATA'
  | 'EMPLOYMENT_DATA'
  | 'FINANCIAL_DATA'
  | 'HEALTH_DATA'
  | 'BIOMETRIC_DATA'
  | 'BEHAVIORAL_DATA'
  | 'TECHNICAL_DATA'
  | 'USAGE_DATA'
  | 'LOCATION_DATA'
  | 'COMMUNICATION_DATA'
  | 'PREFERENCE_DATA'
  | 'CONSENT_DATA';

export type SubmissionStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PROCESSING'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'CANCELLED';

export type Environment = 
  | 'DEVELOPMENT'
  | 'STAGING'
  | 'PRODUCTION';

export type ConfigScope = 
  | 'GLOBAL'
  | 'COMPANY'
  | 'USER'
  | 'INTEGRATION';

export type IntegrationType = 
  | 'CRM'
  | 'ERP'
  | 'HRIS'
  | 'LMS'
  | 'COMMUNICATION'
  | 'STORAGE'
  | 'ANALYTICS'
  | 'SECURITY'
  | 'COMPLIANCE'
  | 'CUSTOM'
  | 'WEBHOOK'
  | 'API';

export type IntegrationStatus = 
  | 'ACTIVE'
  | 'INACTIVE'
  | 'ERROR'
  | 'SYNCING'
  | 'PAUSED'
  | 'MAINTENANCE';

export type LogDirection = 
  | 'INBOUND'
  | 'OUTBOUND'
  | 'INTERNAL';

export type LogStatus = 
  | 'SUCCESS'
  | 'ERROR'
  | 'WARNING'
  | 'INFO'
  | 'DEBUG';

// Core Interfaces

export interface FieldOption {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  enum?: string[];
  custom?: string; // Custom validation function
}

export interface ConditionalLogic {
  condition: string; // JavaScript expression
  action: 'show' | 'hide' | 'enable' | 'disable' | 'require';
  target?: string; // Target field name
}

export interface FieldDefinition {
  id: string;
  name: string;
  label: string;
  description?: string;
  category: string;
  fieldType: FieldType;
  dataType: DataType;
  
  // Behavior
  isRequired: boolean;
  isEncrypted: boolean;
  isSearchable: boolean;
  isFilterable: boolean;
  isSortable: boolean;
  isVisible: boolean;
  isEditable: boolean;
  
  // Validation
  validationRules?: ValidationRule;
  defaultValue?: string;
  placeholder?: string;
  helpText?: string;
  
  // Display
  displayOrder: number;
  groupName?: string;
  
  // Options for select/radio/checkbox fields
  options?: FieldOption[];
  
  // Conditional Logic
  conditionalLogic?: ConditionalLogic[];
  dependencies?: string[];
  
  // GDPR and Compliance
  isPersonalData: boolean;
  gdprCategory?: GDPRDataCategory;
  retentionPeriod?: number;
  
  // Metadata
  version: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  
  // Company relationship
  companyId?: string;
}

export interface FieldValue {
  id: string;
  fieldDefinitionId: string;
  fieldDefinition: FieldDefinition;
  entityType: EntityType;
  entityId: string;
  
  // Value storage (polymorphic)
  textValue?: string;
  numberValue?: number;
  integerValue?: number;
  booleanValue?: boolean;
  dateValue?: string;
  jsonValue?: any;
  
  // Encryption
  encryptedValue?: string;
  encryptionKey?: string;
  isEncrypted: boolean;
  
  // Metadata
  version: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  
  // Company relationship
  companyId: string;
}

export interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  version: string;
  
  // Form configuration
  fields: FieldDefinition[];
  layout?: any;
  validationRules?: any;
  
  // Workflow integration
  workflowId?: string;
  
  // Status
  isActive: boolean;
  isPublished: boolean;
  publishedAt?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  
  // Company relationship
  companyId?: string;
}

export interface FormSubmission {
  id: string;
  formTemplateId: string;
  formTemplate: FormTemplate;
  
  // Submission data
  submissionData: Record<string, any>;
  status: SubmissionStatus;
  
  // Processing
  processedAt?: string;
  processedBy?: string;
  processingNotes?: string;
  
  // Validation
  validationErrors?: any[];
  isValid: boolean;
  
  // Workflow
  workflowInstanceId?: string;
  
  // Metadata
  submittedAt: string;
  updatedAt: string;
  submittedBy?: string;
  
  // Company relationship
  companyId: string;
}

export interface SystemConfiguration {
  id: string;
  key: string;
  value: any;
  description?: string;
  category: string;
  dataType: DataType;
  
  // Behavior
  isSecret: boolean;
  isEditable: boolean;
  
  // Validation
  validationRules?: ValidationRule;
  defaultValue?: any;
  
  // Environment and scope
  environment: Environment;
  scope: ConfigScope;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  
  // Company relationship
  companyId?: string;
}

export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  provider: string;
  version: string;
  
  // Configuration
  configuration: any;
  credentials?: any;
  endpoints?: any;
  
  // Status
  status: IntegrationStatus;
  isEnabled: boolean;
  lastSyncAt?: string;
  lastErrorAt?: string;
  lastError?: string;
  
  // Rate limiting
  rateLimitConfig?: any;
  
  // Webhooks
  webhookUrl?: string;
  webhookSecret?: string;
  webhookEvents: string[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  
  // Company relationship
  companyId: string;
  
  // Logs
  integrationLogs?: IntegrationLog[];
}

export interface IntegrationLog {
  id: string;
  integrationId: string;
  operation: string;
  direction: LogDirection;
  status: LogStatus;
  
  // Data
  requestData?: any;
  responseData?: any;
  errorMessage?: string;
  
  // Performance
  duration?: number;
  retryCount: number;
  
  // Metadata
  metadata?: any;
  createdAt: string;
}

// API Response Types

export interface FieldDefinitionResponse {
  success: boolean;
  data: FieldDefinition;
  message?: string;
}

export interface FieldDefinitionListResponse {
  success: boolean;
  data: FieldDefinition[];
  message?: string;
}

export interface FormTemplateResponse {
  success: boolean;
  data: FormTemplate;
  message?: string;
}

export interface FormTemplateListResponse {
  success: boolean;
  data: FormTemplate[];
  message?: string;
}

export interface FormSubmissionResponse {
  success: boolean;
  data: FormSubmission;
  message?: string;
}

export interface SystemConfigurationResponse {
  success: boolean;
  data: SystemConfiguration;
  message?: string;
}

export interface SystemConfigurationListResponse {
  success: boolean;
  data: SystemConfiguration[];
  message?: string;
}

export interface IntegrationResponse {
  success: boolean;
  data: Integration;
  message?: string;
}

export interface IntegrationListResponse {
  success: boolean;
  data: Integration[];
  message?: string;
}

// Form Builder Types

export interface FormBuilderState {
  template: FormTemplate | null;
  fields: FieldDefinition[];
  selectedField: FieldDefinition | null;
  isDirty: boolean;
  isPreviewMode: boolean;
}

export interface FieldEditorProps {
  field?: FieldDefinition;
  onSave: (field: FieldDefinition) => void;
  onCancel: () => void;
  open: boolean;
}

export interface FormRendererProps {
  template: FormTemplate;
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
  onCancel?: () => void;
  readOnly?: boolean;
  loading?: boolean;
}

// Hook Types

export interface UseFormBuilderReturn {
  template: FormTemplate | null;
  fields: FieldDefinition[];
  loading: boolean;
  error: string | null;
  createTemplate: (data: Partial<FormTemplate>) => Promise<FormTemplate>;
  updateTemplate: (id: string, data: Partial<FormTemplate>) => Promise<FormTemplate>;
  addField: (field: FieldDefinition) => Promise<FieldDefinition>;
  updateField: (id: string, field: Partial<FieldDefinition>) => Promise<FieldDefinition>;
  removeField: (id: string) => Promise<void>;
  reorderFields: (sourceIndex: number, destinationIndex: number) => Promise<void>;
}

export interface UseDynamicFieldsReturn {
  fields: FieldDefinition[];
  loading: boolean;
  error: string | null;
  createField: (data: Partial<FieldDefinition>) => Promise<FieldDefinition>;
  updateField: (id: string, data: Partial<FieldDefinition>) => Promise<FieldDefinition>;
  deleteField: (id: string) => Promise<void>;
  getFieldsByCategory: (category: string) => FieldDefinition[];
}

export interface UseSystemConfigReturn {
  configurations: SystemConfiguration[];
  loading: boolean;
  error: string | null;
  getConfig: (key: string) => Promise<any>;
  setConfig: (key: string, value: any, options?: Partial<SystemConfiguration>) => Promise<void>;
  deleteConfig: (key: string) => Promise<void>;
  getConfigsByCategory: (category: string) => SystemConfiguration[];
}

export interface UseIntegrationsReturn {
  integrations: Integration[];
  loading: boolean;
  error: string | null;
  createIntegration: (data: Partial<Integration>) => Promise<Integration>;
  updateIntegration: (id: string, data: Partial<Integration>) => Promise<Integration>;
  deleteIntegration: (id: string) => Promise<void>;
  enableIntegration: (id: string) => Promise<void>;
  disableIntegration: (id: string) => Promise<void>;
  syncIntegration: (id: string, entityType: string) => Promise<any>;
  getLogs: (id: string) => Promise<IntegrationLog[]>;
}

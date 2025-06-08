-- CreateEnum for new field types
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'TEXTAREA', 'EMAIL', 'PASSWORD', 'URL', 'PHONE', 'NUMBER', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'DATE', 'DATETIME', 'TIME', 'SELECT', 'MULTISELECT', 'RADIO', 'CHECKBOX', 'FILE', 'IMAGE', 'JSON', 'ARRAY', 'OBJECT', 'ENCRYPTED_TEXT', 'SIGNATURE', 'LOCATION', 'COLOR', 'RATING', 'SLIDER', 'RICH_TEXT', 'CODE', 'BARCODE', 'QR_CODE');

-- CreateEnum for data types
CREATE TYPE "DataType" AS ENUM ('STRING', 'NUMBER', 'INTEGER', 'BOOLEAN', 'DATE', 'DATETIME', 'JSON', 'ARRAY', 'OBJECT', 'BINARY', 'UUID', 'EMAIL', 'URL', 'PHONE', 'ENCRYPTED');

-- CreateEnum for entity types
CREATE TYPE "EntityType" AS ENUM ('PERSONA', 'TRAINING_RECORD', 'CERTIFICATION', 'COMPETENCY', 'DOCUMENT', 'INCIDENT', 'WORKFLOW', 'WORKFLOW_TASK', 'RISK_ASSESSMENT', 'AUDIT_LOG', 'FORM_SUBMISSION', 'CUSTOM');

-- CreateEnum for GDPR data categories
CREATE TYPE "GDPRDataCategory" AS ENUM ('PERSONAL_IDENTIFIERS', 'CONTACT_INFORMATION', 'DEMOGRAPHIC_DATA', 'EMPLOYMENT_DATA', 'FINANCIAL_DATA', 'HEALTH_DATA', 'BIOMETRIC_DATA', 'BEHAVIORAL_DATA', 'TECHNICAL_DATA', 'USAGE_DATA', 'LOCATION_DATA', 'COMMUNICATION_DATA', 'PREFERENCE_DATA', 'CONSENT_DATA');

-- CreateEnum for submission status
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PROCESSING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum for environment
CREATE TYPE "Environment" AS ENUM ('DEVELOPMENT', 'STAGING', 'PRODUCTION');

-- CreateEnum for config scope
CREATE TYPE "ConfigScope" AS ENUM ('GLOBAL', 'COMPANY', 'USER', 'INTEGRATION');

-- CreateEnum for integration types
CREATE TYPE "IntegrationType" AS ENUM ('CRM', 'ERP', 'HRIS', 'LMS', 'COMMUNICATION', 'STORAGE', 'ANALYTICS', 'SECURITY', 'COMPLIANCE', 'CUSTOM', 'WEBHOOK', 'API');

-- CreateEnum for integration status
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR', 'SYNCING', 'PAUSED', 'MAINTENANCE');

-- CreateEnum for log direction
CREATE TYPE "LogDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'INTERNAL');

-- CreateEnum for log status
CREATE TYPE "LogStatus" AS ENUM ('SUCCESS', 'ERROR', 'WARNING', 'INFO', 'DEBUG');

-- CreateTable for field definitions
CREATE TABLE "field_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "fieldType" "FieldType" NOT NULL,
    "dataType" "DataType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "isSearchable" BOOLEAN NOT NULL DEFAULT true,
    "isFilterable" BOOLEAN NOT NULL DEFAULT true,
    "isSortable" BOOLEAN NOT NULL DEFAULT true,
    "validationRules" JSONB,
    "defaultValue" TEXT,
    "placeholder" TEXT,
    "helpText" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isEditable" BOOLEAN NOT NULL DEFAULT true,
    "groupName" TEXT,
    "options" JSONB,
    "conditionalLogic" JSONB,
    "dependencies" TEXT[],
    "isPersonalData" BOOLEAN NOT NULL DEFAULT false,
    "gdprCategory" "GDPRDataCategory",
    "retentionPeriod" INTEGER,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "companyId" TEXT,

    CONSTRAINT "field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable for field values
CREATE TABLE "field_values" (
    "id" TEXT NOT NULL,
    "fieldDefinitionId" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "textValue" TEXT,
    "numberValue" DOUBLE PRECISION,
    "integerValue" INTEGER,
    "booleanValue" BOOLEAN,
    "dateValue" TIMESTAMP(3),
    "jsonValue" JSONB,
    "encryptedValue" TEXT,
    "encryptionKey" TEXT,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable for form templates
CREATE TABLE "form_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "fields" JSONB NOT NULL,
    "layout" JSONB,
    "validationRules" JSONB,
    "workflowId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "companyId" TEXT,

    CONSTRAINT "form_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable for form submissions
CREATE TABLE "form_submissions" (
    "id" TEXT NOT NULL,
    "formTemplateId" TEXT NOT NULL,
    "submissionData" JSONB NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "processingNotes" TEXT,
    "validationErrors" JSONB,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "workflowInstanceId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedBy" TEXT,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable for system configurations
CREATE TABLE "system_configurations" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "dataType" "DataType" NOT NULL,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "isEditable" BOOLEAN NOT NULL DEFAULT true,
    "validationRules" JSONB,
    "defaultValue" JSONB,
    "environment" "Environment" NOT NULL DEFAULT 'PRODUCTION',
    "scope" "ConfigScope" NOT NULL DEFAULT 'GLOBAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "companyId" TEXT,

    CONSTRAINT "system_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable for integrations
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "provider" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "configuration" JSONB NOT NULL,
    "credentials" JSONB,
    "endpoints" JSONB,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'INACTIVE',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastError" TEXT,
    "rateLimitConfig" JSONB,
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "webhookEvents" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable for integration logs
CREATE TABLE "integration_logs" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "direction" "LogDirection" NOT NULL,
    "status" "LogStatus" NOT NULL,
    "requestData" JSONB,
    "responseData" JSONB,
    "errorMessage" TEXT,
    "duration" INTEGER,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "field_definitions_name_companyId_key" ON "field_definitions"("name", "companyId");

-- CreateIndex
CREATE INDEX "field_definitions_category_isActive_idx" ON "field_definitions"("category", "isActive");

-- CreateIndex
CREATE INDEX "field_definitions_fieldType_isActive_idx" ON "field_definitions"("fieldType", "isActive");

-- CreateIndex
CREATE INDEX "field_definitions_companyId_isActive_idx" ON "field_definitions"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "field_values_fieldDefinitionId_entityType_entityId_key" ON "field_values"("fieldDefinitionId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "field_values_entityType_entityId_idx" ON "field_values"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "field_values_companyId_entityType_idx" ON "field_values"("companyId", "entityType");

-- CreateIndex
CREATE INDEX "field_values_fieldDefinitionId_companyId_idx" ON "field_values"("fieldDefinitionId", "companyId");

-- CreateIndex
CREATE INDEX "form_templates_category_isActive_idx" ON "form_templates"("category", "isActive");

-- CreateIndex
CREATE INDEX "form_templates_companyId_isActive_idx" ON "form_templates"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "form_submissions_formTemplateId_status_idx" ON "form_submissions"("formTemplateId", "status");

-- CreateIndex
CREATE INDEX "form_submissions_companyId_submittedAt_idx" ON "form_submissions"("companyId", "submittedAt");

-- CreateIndex
CREATE INDEX "form_submissions_status_submittedAt_idx" ON "form_submissions"("status", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "system_configurations_key_key" ON "system_configurations"("key");

-- CreateIndex
CREATE INDEX "system_configurations_category_scope_idx" ON "system_configurations"("category", "scope");

-- CreateIndex
CREATE INDEX "system_configurations_companyId_category_idx" ON "system_configurations"("companyId", "category");

-- CreateIndex
CREATE INDEX "integrations_companyId_type_idx" ON "integrations"("companyId", "type");

-- CreateIndex
CREATE INDEX "integrations_status_isEnabled_idx" ON "integrations"("status", "isEnabled");

-- CreateIndex
CREATE INDEX "integration_logs_integrationId_createdAt_idx" ON "integration_logs"("integrationId", "createdAt");

-- CreateIndex
CREATE INDEX "integration_logs_status_createdAt_idx" ON "integration_logs"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "field_definitions" ADD CONSTRAINT "field_definitions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_values" ADD CONSTRAINT "field_values_fieldDefinitionId_fkey" FOREIGN KEY ("fieldDefinitionId") REFERENCES "field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_values" ADD CONSTRAINT "field_values_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "sms_workflows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_formTemplateId_fkey" FOREIGN KEY ("formTemplateId") REFERENCES "form_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "sms_workflow_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_configurations" ADD CONSTRAINT "system_configurations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_logs" ADD CONSTRAINT "integration_logs_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

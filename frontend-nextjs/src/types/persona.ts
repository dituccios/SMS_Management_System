// PersonaManagement Types

export type EmploymentType = 
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACT'
  | 'TEMPORARY'
  | 'INTERN'
  | 'CONSULTANT';

export type PersonaStatus = 
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'TERMINATED'
  | 'ON_LEAVE';

export type TrainingStatus = 
  | 'ENROLLED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'OVERDUE';

export type ComplianceStatus = 
  | 'COMPLIANT'
  | 'NON_COMPLIANT'
  | 'PENDING'
  | 'OVERDUE'
  | 'EXEMPT';

export type CertificationType = 
  | 'PROFESSIONAL'
  | 'REGULATORY'
  | 'INTERNAL'
  | 'VENDOR'
  | 'ACADEMIC';

export type CertificationStatus = 
  | 'ACTIVE'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'REVOKED'
  | 'PENDING_RENEWAL';

export type ComplianceLevel = 
  | 'BASIC'
  | 'STANDARD'
  | 'ADVANCED'
  | 'CRITICAL';

export type CompetencyType = 
  | 'SKILL'
  | 'KNOWLEDGE'
  | 'BEHAVIOR'
  | 'CERTIFICATION';

export type CompetencyLevel = 
  | 'BEGINNER'
  | 'INTERMEDIATE'
  | 'ADVANCED'
  | 'EXPERT'
  | 'MASTER';

export type CompetencyStatus = 
  | 'ACTIVE'
  | 'INACTIVE'
  | 'UNDER_DEVELOPMENT'
  | 'VALIDATED'
  | 'EXPIRED';

export type Priority = 
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export type ConsentType = 
  | 'DATA_PROCESSING'
  | 'MARKETING'
  | 'ANALYTICS'
  | 'COOKIES'
  | 'THIRD_PARTY_SHARING'
  | 'PROFILING';

export type ConsentStatus = 
  | 'GRANTED'
  | 'WITHDRAWN'
  | 'EXPIRED'
  | 'PENDING';

export type ExportStatus = 
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED';

export type ExportFormat = 
  | 'JSON'
  | 'CSV'
  | 'XML'
  | 'PDF';

// Core Interfaces

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phoneNumber: string;
  email: string;
}

export interface PersonaProfile {
  id: string;
  employeeId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  nationalId?: string;
  address?: Address;
  emergencyContact?: EmergencyContact;
  
  // Employment Information
  department?: string;
  position?: string;
  employmentType: EmploymentType;
  startDate?: string;
  endDate?: string;
  managerId?: string;
  manager?: PersonaProfile;
  subordinates?: PersonaProfile[];
  
  // Status and Metadata
  status: PersonaStatus;
  isActive: boolean;
  lastLogin?: string;
  profileCompleteness: number;
  
  // GDPR Compliance
  dataProcessingConsent: boolean;
  marketingConsent?: boolean;
  consentTimestamp?: string;
  consentVersion?: string;
  dataRetentionUntil?: string;
  pseudonymizationKey?: string;
  anonymizationDate?: string;
  
  // Audit Fields
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  
  // Relationships
  companyId: string;
  userId?: string;
  trainingRecords?: TrainingRecord[];
  certifications?: Certification[];
  competencies?: PersonaCompetency[];
  consentRecords?: ConsentRecord[];
}

export interface TrainingRecord {
  id: string;
  trainingId: string;
  training: {
    id: string;
    title: string;
    description?: string;
    category: string;
    duration?: number;
  };
  personaId: string;
  persona: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: string;
    position?: string;
  };
  
  // Training Details
  enrollmentDate: string;
  startDate?: string;
  completionDate?: string;
  expiryDate?: string;
  
  // Progress and Results
  status: TrainingStatus;
  progress: number;
  score?: number;
  passingScore?: number;
  attempts: number;
  maxAttempts?: number;
  
  // Certification Information
  certificateNumber?: string;
  certificateUrl?: string;
  issuedBy?: string;
  
  // Compliance and Tracking
  isRequired: boolean;
  complianceStatus: ComplianceStatus;
  remindersSent: number;
  lastReminderDate?: string;
  
  // Metadata
  metadata?: any;
  notes?: string;
  
  // Audit Fields
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  companyId: string;
}

export interface Certification {
  id: string;
  name: string;
  description?: string;
  type: CertificationType;
  category?: string;
  
  // Issuing Authority
  issuingAuthority: string;
  authorityUrl?: string;
  accreditationBody?: string;
  
  // Certification Details
  certificateNumber: string;
  issueDate: string;
  expiryDate?: string;
  validityPeriod?: number;
  
  // Requirements and Prerequisites
  prerequisites?: any;
  requirements?: any;
  renewalRequirements?: any;
  
  // Status and Compliance
  status: CertificationStatus;
  complianceLevel: ComplianceLevel;
  isRegulatory: boolean;
  
  // File Attachments
  certificateUrl?: string;
  attachments?: any;
  
  // Metadata
  metadata?: any;
  tags?: string[];
  
  // Audit Fields
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  
  // Relationships
  personaId: string;
  persona: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: string;
    position?: string;
  };
  companyId: string;
}

export interface PersonaCompetency {
  id: string;
  name: string;
  description?: string;
  category: string;
  type: CompetencyType;
  
  // Assessment Details
  currentLevel: CompetencyLevel;
  targetLevel?: CompetencyLevel;
  assessmentDate?: string;
  nextAssessmentDate?: string;
  
  // Scoring
  score?: number;
  maxScore: number;
  passingScore: number;
  
  // Evidence and Validation
  evidenceUrl?: string;
  validatedBy?: string;
  validationDate?: string;
  
  // Development Plan
  developmentPlan?: any;
  trainingRequired: boolean;
  
  // Status and Tracking
  status: CompetencyStatus;
  priority: Priority;
  
  // Metadata
  metadata?: any;
  notes?: string;
  
  // Audit Fields
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  
  // Relationships
  personaId: string;
  persona: PersonaProfile;
  companyId: string;
}

export interface ConsentRecord {
  id: string;
  consentType: ConsentType;
  status: ConsentStatus;
  version: string;
  
  // Consent Details
  purpose: string;
  legalBasis: string;
  dataCategories: string[];
  retentionPeriod?: number;
  
  // Consent Lifecycle
  grantedAt?: string;
  withdrawnAt?: string;
  expiresAt?: string;
  lastUpdated: string;
  
  // Consent Capture Details
  consentMethod?: string;
  ipAddress?: string;
  userAgent?: string;
  consentText?: string;
  
  // Processing Details
  thirdParties?: any;
  transferCountries: string[];
  automatedDecision: boolean;
  
  // Metadata
  metadata?: any;
  notes?: string;
  
  // Audit Fields
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  
  // Relationships
  personaId: string;
  persona: PersonaProfile;
  companyId: string;
}

export interface DataExport {
  id: string;
  requestId: string;
  status: ExportStatus;
  format: ExportFormat;
  
  // Export Details
  dataCategories: string[];
  dateRange?: any;
  includeDeleted: boolean;
  
  // File Information
  fileName?: string;
  fileSize?: number;
  fileUrl?: string;
  downloadCount: number;
  
  // Security
  encryptionKey?: string;
  checksum?: string;
  expiresAt?: string;
  
  // Processing Details
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  downloadedAt?: string;
  
  // Error Handling
  errorMessage?: string;
  retryCount: number;
  
  // Metadata
  metadata?: any;
  
  // Audit Fields
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  
  // Relationships
  personaId: string;
  persona: PersonaProfile;
  companyId: string;
}

// API Response Types

export interface PersonaProfileResponse {
  success: boolean;
  data: PersonaProfile;
  message?: string;
}

export interface PersonaProfileListResponse {
  success: boolean;
  data: PersonaProfile[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  message?: string;
}

export interface TrainingRecordResponse {
  success: boolean;
  data: TrainingRecord;
  message?: string;
}

export interface TrainingRecordListResponse {
  success: boolean;
  data: TrainingRecord[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  message?: string;
}

export interface CertificationResponse {
  success: boolean;
  data: Certification;
  message?: string;
}

export interface CertificationListResponse {
  success: boolean;
  data: Certification[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  message?: string;
}

export interface ComplianceOverviewResponse {
  success: boolean;
  data: {
    totalPersonas: number;
    activePersonas: number;
    trainingCompliance: Record<string, number>;
    certificationStatus: Record<string, number>;
    competencyStats: Record<string, number>;
    generatedAt: string;
  };
  message?: string;
}

// Form Types

export interface PersonaFormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: Date | null;
  nationalId?: string;
  employeeId?: string;
  department?: string;
  position?: string;
  employmentType: EmploymentType;
  startDate?: Date | null;
  endDate?: Date | null;
  managerId?: string;
  address?: Address;
  emergencyContact?: EmergencyContact;
  dataProcessingConsent: boolean;
  marketingConsent?: boolean;
  consentVersion?: string;
}

export interface TrainingRecordFormData {
  trainingId: string;
  personaId: string;
  enrollmentDate?: Date | null;
  startDate?: Date | null;
  completionDate?: Date | null;
  expiryDate?: Date | null;
  status?: TrainingStatus;
  progress?: number;
  score?: number;
  isRequired?: boolean;
  metadata?: any;
  notes?: string;
}

export interface CertificationFormData {
  name: string;
  description?: string;
  type: CertificationType;
  category?: string;
  issuingAuthority: string;
  certificateNumber: string;
  issueDate: Date;
  expiryDate?: Date | null;
  validityPeriod?: number;
  status?: CertificationStatus;
  complianceLevel?: ComplianceLevel;
  isRegulatory?: boolean;
  certificateUrl?: string;
  personaId: string;
}

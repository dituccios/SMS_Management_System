// User and Authentication Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  company?: Company;
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  country: string;
  size: CompanySize;
}

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  USER = 'USER',
  VIEWER = 'VIEWER',
}

export enum CompanySize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  ENTERPRISE = 'ENTERPRISE',
}

// SMS Document Types
export interface SMSDocument {
  id: string;
  title: string;
  description?: string;
  content?: string;
  version: string;
  status: DocumentStatus;
  category: DocumentCategory;
  type: DocumentType;
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
  tags: string[];
  metadata?: any;
  expiresAt?: string;
  reviewDate?: string;
  createdAt: string;
  updatedAt: string;
  author: {
    firstName: string;
    lastName: string;
  };
  versions?: SMSDocumentVersion[];
  reviews?: SMSReview[];
}

export interface SMSDocumentVersion {
  id: string;
  version: string;
  content?: string;
  filePath?: string;
  changeLog?: string;
  createdAt: string;
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  ARCHIVED = 'ARCHIVED',
  EXPIRED = 'EXPIRED',
}

export enum DocumentCategory {
  POLICY = 'POLICY',
  PROCEDURE = 'PROCEDURE',
  WORK_INSTRUCTION = 'WORK_INSTRUCTION',
  FORM = 'FORM',
  RECORD = 'RECORD',
  MANUAL = 'MANUAL',
  CERTIFICATE = 'CERTIFICATE',
  OTHER = 'OTHER',
}

export enum DocumentType {
  SAFETY_POLICY = 'SAFETY_POLICY',
  EMERGENCY_PROCEDURE = 'EMERGENCY_PROCEDURE',
  TRAINING_MATERIAL = 'TRAINING_MATERIAL',
  INCIDENT_REPORT = 'INCIDENT_REPORT',
  AUDIT_REPORT = 'AUDIT_REPORT',
  RISK_ASSESSMENT = 'RISK_ASSESSMENT',
  COMPLIANCE_DOCUMENT = 'COMPLIANCE_DOCUMENT',
  OTHER = 'OTHER',
}

// Workflow Types
export interface SMSWorkflow {
  id: string;
  name: string;
  description?: string;
  category: string;
  steps: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    firstName: string;
    lastName: string;
  };
  instances?: SMSWorkflowInstance[];
}

export interface SMSWorkflowInstance {
  id: string;
  status: WorkflowStatus;
  currentStep: number;
  data?: any;
  startedAt: string;
  completedAt?: string;
  workflow: {
    name: string;
  };
  document?: {
    id: string;
    title: string;
  };
  tasks: SMSWorkflowTask[];
}

export interface SMSWorkflowTask {
  id: string;
  name: string;
  description?: string;
  status: TaskStatus;
  dueDate?: string;
  completedAt?: string;
  comments?: string;
  assignee?: {
    firstName: string;
    lastName: string;
  };
}

export enum WorkflowStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  OVERDUE = 'OVERDUE',
}

// Review Types
export interface SMSReview {
  id: string;
  status: ReviewStatus;
  priority: ReviewPriority;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  document: {
    id: string;
    title: string;
    category: string;
  };
  reviewer: {
    firstName: string;
    lastName: string;
  };
  comments: SMSReviewComment[];
}

export interface SMSReviewComment {
  id: string;
  content: string;
  type: CommentType;
  createdAt: string;
  author: {
    firstName: string;
    lastName: string;
  };
}

export enum ReviewStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum ReviewPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum CommentType {
  GENERAL = 'GENERAL',
  SUGGESTION = 'SUGGESTION',
  ISSUE = 'ISSUE',
  APPROVAL = 'APPROVAL',
  REJECTION = 'REJECTION',
}

// Incident Types
export interface SMSIncident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  category: string;
  location?: string;
  reportedAt: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  reporter: {
    firstName: string;
    lastName: string;
  };
}

export enum IncidentSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum IncidentStatus {
  OPEN = 'OPEN',
  INVESTIGATING = 'INVESTIGATING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

// Training Types
export interface SMSTraining {
  id: string;
  title: string;
  description?: string;
  category: string;
  duration?: number;
  status: TrainingStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    firstName: string;
    lastName: string;
  };
}

export enum TrainingStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

// Risk Assessment Types
export interface SMSRiskAssessment {
  id: string;
  title: string;
  description?: string;
  riskLevel: RiskLevel;
  probability: number;
  impact: number;
  mitigation?: string;
  createdAt: string;
  updatedAt: string;
  assessor: {
    firstName: string;
    lastName: string;
  };
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Audit Types
export interface SMSAuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
}

export interface PaginationData<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Dashboard Types
export interface DashboardStats {
  documents: {
    total: number;
    active: number;
    expired: number;
    underReview: number;
  };
  workflows: {
    total: number;
    active: number;
    completed: number;
  };
  incidents: {
    total: number;
    open: number;
    resolved: number;
  };
  trainings: {
    total: number;
    active: number;
  };
  riskAssessments: {
    total: number;
    highRisk: number;
  };
}

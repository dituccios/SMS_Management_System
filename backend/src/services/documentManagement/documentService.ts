import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { EventEmitter } from 'events';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();

export interface DocumentMetadata {
  title: string;
  description?: string;
  categoryId: string;
  typeId: string;
  securityLevel?: string;
  tags?: string[];
  customMetadata?: any;
  retentionPeriod?: number;
  reviewDueAt?: Date;
  expiresAt?: Date;
}

export interface DocumentUpload {
  file: Buffer;
  fileName: string;
  mimeType: string;
  metadata: DocumentMetadata;
  uploadedBy: string;
  companyId: string;
}

export interface DocumentFilter {
  companyId: string;
  categoryId?: string;
  typeId?: string;
  status?: string[];
  securityLevel?: string[];
  tags?: string[];
  createdBy?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}

export class DocumentService extends EventEmitter {
  private readonly uploadPath: string;
  private readonly maxFileSize: number;

  constructor() {
    super();
    this.uploadPath = process.env.DOCUMENT_UPLOAD_PATH || './uploads/documents';
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '104857600'); // 100MB default
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
    } catch (error) {
      logger.error('Failed to create upload directory:', error);
    }
  }

  // Document CRUD Operations
  async uploadDocument(upload: DocumentUpload): Promise<any> {
    try {
      // Validate file size
      if (upload.file.length > this.maxFileSize) {
        throw new Error('File size exceeds maximum allowed size');
      }

      // Validate document type
      const documentType = await prisma.documentType.findUnique({
        where: { id: upload.metadata.typeId }
      });

      if (!documentType) {
        throw new Error('Invalid document type');
      }

      // Validate file extension
      const fileExtension = path.extname(upload.fileName).toLowerCase();
      if (documentType.fileExtensions.length > 0 && 
          !documentType.fileExtensions.includes(fileExtension)) {
        throw new Error(`File type ${fileExtension} not allowed for this document type`);
      }

      // Generate unique file name and path
      const fileId = crypto.randomUUID();
      const fileName = `${fileId}${fileExtension}`;
      const filePath = path.join(this.uploadPath, upload.companyId, fileName);
      
      // Ensure company directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // Calculate file checksum
      const checksum = crypto.createHash('sha256').update(upload.file).digest('hex');

      // Check for duplicate files
      const existingDocument = await prisma.document.findFirst({
        where: {
          checksum,
          companyId: upload.companyId
        }
      });

      if (existingDocument) {
        throw new Error('Document with identical content already exists');
      }

      // Save file to disk
      await fs.writeFile(filePath, upload.file);

      // Extract text content for search indexing
      const content = await this.extractTextContent(upload.file, upload.mimeType);

      // Create document record
      const document = await prisma.document.create({
        data: {
          title: upload.metadata.title,
          description: upload.metadata.description,
          fileName,
          originalFileName: upload.fileName,
          filePath,
          fileSize: upload.file.length,
          mimeType: upload.mimeType,
          checksum,
          categoryId: upload.metadata.categoryId,
          typeId: upload.metadata.typeId,
          securityLevel: upload.metadata.securityLevel as any || 'INTERNAL',
          tags: upload.metadata.tags || [],
          content,
          retentionPeriod: upload.metadata.retentionPeriod,
          reviewDueAt: upload.metadata.reviewDueAt,
          expiresAt: upload.metadata.expiresAt,
          metadata: upload.metadata.customMetadata,
          companyId: upload.companyId,
          createdBy: upload.uploadedBy,
          status: 'DRAFT'
        },
        include: {
          category: true,
          type: true
        }
      });

      // Create initial version record
      await prisma.documentVersion.create({
        data: {
          documentId: document.id,
          version: '1.0',
          versionNumber: 1,
          fileName,
          filePath,
          fileSize: upload.file.length,
          checksum,
          createdBy: upload.uploadedBy
        }
      });

      // Log document creation
      await this.logDocumentAccess(document.id, upload.uploadedBy, 'EDIT', {
        action: 'document_created',
        fileName: upload.fileName
      });

      // Emit document uploaded event
      this.emit('documentUploaded', { document, uploadedBy: upload.uploadedBy });

      // Check if approval is required
      if (documentType.requiresApproval) {
        await this.initiateApprovalWorkflow(document.id);
      }

      logger.info(`Document uploaded: ${document.id}`, {
        title: document.title,
        fileName: upload.fileName,
        companyId: upload.companyId,
        uploadedBy: upload.uploadedBy
      });

      return document;
    } catch (error) {
      logger.error('Failed to upload document:', error);
      throw error;
    }
  }

  async getDocument(id: string, userId: string): Promise<any> {
    try {
      const document = await prisma.document.findUnique({
        where: { id },
        include: {
          category: true,
          type: true,
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 5
          },
          approvals: {
            include: {
              // Would include user details in real implementation
            }
          },
          reviews: {
            where: { status: 'PENDING' }
          },
          comments: {
            include: {
              replies: true
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Check access permissions
      const hasAccess = await this.checkDocumentAccess(document, userId, 'VIEW');
      if (!hasAccess) {
        throw new Error('Access denied');
      }

      // Log document access
      await this.logDocumentAccess(id, userId, 'VIEW');

      return document;
    } catch (error) {
      logger.error('Failed to get document:', error);
      throw error;
    }
  }

  async updateDocument(id: string, updates: Partial<DocumentMetadata>, userId: string): Promise<any> {
    try {
      const document = await prisma.document.findUnique({
        where: { id }
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Check edit permissions
      const hasAccess = await this.checkDocumentAccess(document, userId, 'EDIT');
      if (!hasAccess) {
        throw new Error('Access denied');
      }

      const updatedDocument = await prisma.document.update({
        where: { id },
        data: {
          title: updates.title,
          description: updates.description,
          categoryId: updates.categoryId,
          typeId: updates.typeId,
          securityLevel: updates.securityLevel as any,
          tags: updates.tags,
          retentionPeriod: updates.retentionPeriod,
          reviewDueAt: updates.reviewDueAt,
          expiresAt: updates.expiresAt,
          metadata: updates.customMetadata,
          updatedBy: userId
        },
        include: {
          category: true,
          type: true
        }
      });

      // Log document update
      await this.logDocumentAccess(id, userId, 'EDIT', {
        action: 'document_updated',
        changes: updates
      });

      this.emit('documentUpdated', { document: updatedDocument, updatedBy: userId });

      return updatedDocument;
    } catch (error) {
      logger.error('Failed to update document:', error);
      throw error;
    }
  }

  async deleteDocument(id: string, userId: string, reason?: string): Promise<void> {
    try {
      const document = await prisma.document.findUnique({
        where: { id }
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Check delete permissions
      const hasAccess = await this.checkDocumentAccess(document, userId, 'DELETE');
      if (!hasAccess) {
        throw new Error('Access denied');
      }

      // Check if document is under legal hold
      if (document.legalHold) {
        throw new Error('Cannot delete document under legal hold');
      }

      // Soft delete - mark as deleted but keep record
      await prisma.document.update({
        where: { id },
        data: {
          status: 'DELETED',
          updatedBy: userId,
          complianceNotes: reason
        }
      });

      // Log document deletion
      await this.logDocumentAccess(id, userId, 'DELETE', {
        action: 'document_deleted',
        reason
      });

      this.emit('documentDeleted', { documentId: id, deletedBy: userId, reason });

      logger.info(`Document deleted: ${id}`, { deletedBy: userId, reason });
    } catch (error) {
      logger.error('Failed to delete document:', error);
      throw error;
    }
  }

  async searchDocuments(filter: DocumentFilter, limit = 50, offset = 0): Promise<any> {
    try {
      const where: any = {
        companyId: filter.companyId,
        status: { not: 'DELETED' }
      };

      // Apply filters
      if (filter.categoryId) where.categoryId = filter.categoryId;
      if (filter.typeId) where.typeId = filter.typeId;
      if (filter.status?.length) where.status = { in: filter.status };
      if (filter.securityLevel?.length) where.securityLevel = { in: filter.securityLevel };
      if (filter.tags?.length) where.tags = { hasSome: filter.tags };
      if (filter.createdBy) where.createdBy = filter.createdBy;

      if (filter.dateRange) {
        where.createdAt = {
          gte: filter.dateRange.start,
          lte: filter.dateRange.end
        };
      }

      // Full-text search
      if (filter.searchQuery) {
        where.OR = [
          { title: { contains: filter.searchQuery, mode: 'insensitive' } },
          { description: { contains: filter.searchQuery, mode: 'insensitive' } },
          { content: { contains: filter.searchQuery, mode: 'insensitive' } },
          { tags: { hasSome: [filter.searchQuery] } }
        ];
      }

      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where,
          include: {
            category: true,
            type: true
          },
          orderBy: { updatedAt: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.document.count({ where })
      ]);

      return {
        documents,
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      };
    } catch (error) {
      logger.error('Failed to search documents:', error);
      throw error;
    }
  }

  // Access Control
  private async checkDocumentAccess(document: any, userId: string, action: string): Promise<boolean> {
    try {
      // System admin has full access
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (user?.role === 'ADMIN') {
        return true;
      }

      // Document creator has full access
      if (document.createdBy === userId) {
        return true;
      }

      // Check document-specific permissions
      if (document.permissions) {
        const userPermissions = document.permissions[userId] || document.permissions[user?.role];
        if (userPermissions && userPermissions.includes(action)) {
          return true;
        }
      }

      // Check category permissions
      const category = await prisma.documentCategory.findUnique({
        where: { id: document.categoryId }
      });

      if (category?.permissions) {
        const userPermissions = category.permissions[userId] || category.permissions[user?.role];
        if (userPermissions && userPermissions.includes(action)) {
          return true;
        }
      }

      // Default access based on security level and user role
      switch (document.securityLevel) {
        case 'PUBLIC':
          return ['VIEW', 'DOWNLOAD'].includes(action);
        case 'INTERNAL':
          return user?.companyId === document.companyId;
        case 'CONFIDENTIAL':
          return user?.role === 'ADMIN' || user?.role === 'MANAGER';
        case 'RESTRICTED':
          return user?.role === 'ADMIN';
        default:
          return false;
      }
    } catch (error) {
      logger.error('Failed to check document access:', error);
      return false;
    }
  }

  // Utility Methods
  private async extractTextContent(file: Buffer, mimeType: string): Promise<string | null> {
    try {
      // This would integrate with text extraction libraries
      // For now, return null - implement based on requirements
      return null;
    } catch (error) {
      logger.error('Failed to extract text content:', error);
      return null;
    }
  }

  private async logDocumentAccess(documentId: string, userId: string, action: string, details?: any): Promise<void> {
    try {
      await prisma.documentAccessLog.create({
        data: {
          documentId,
          userId,
          action: action as any,
          details
        }
      });
    } catch (error) {
      logger.error('Failed to log document access:', error);
    }
  }

  private async initiateApprovalWorkflow(documentId: string): Promise<void> {
    try {
      // This would integrate with the workflow engine
      // For now, just emit an event
      this.emit('approvalRequired', { documentId });
    } catch (error) {
      logger.error('Failed to initiate approval workflow:', error);
    }
  }
}

export default new DocumentService();

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

export interface CategoryData {
  name: string;
  description?: string;
  parentId?: string;
  permissions?: any;
  sortOrder?: number;
  companyId: string;
}

export interface DocumentTypeData {
  name: string;
  description?: string;
  fileExtensions: string[];
  maxFileSize?: number;
  requiresApproval?: boolean;
  approvalWorkflow?: any;
  reviewCycle?: number;
  retentionPeriod?: number;
  formFields?: any;
  companyId: string;
}

export class DocumentClassificationService {
  
  // Category Management
  async createCategory(data: CategoryData, createdBy?: string): Promise<any> {
    try {
      // Generate hierarchical path
      let path = `/${data.name.toLowerCase().replace(/\s+/g, '-')}`;
      
      if (data.parentId) {
        const parent = await prisma.documentCategory.findUnique({
          where: { id: data.parentId }
        });
        
        if (parent) {
          path = `${parent.path}${path}`;
        }
      }

      const category = await prisma.documentCategory.create({
        data: {
          name: data.name,
          description: data.description,
          parentId: data.parentId,
          path,
          permissions: data.permissions,
          sortOrder: data.sortOrder || 0,
          companyId: data.companyId,
          createdBy
        },
        include: {
          parent: true,
          children: true
        }
      });

      logger.info(`Document category created: ${category.id}`, {
        name: data.name,
        companyId: data.companyId
      });

      return category;
    } catch (error) {
      logger.error('Failed to create document category:', error);
      throw error;
    }
  }

  async getCategories(companyId: string, includeInactive = false): Promise<any[]> {
    try {
      const where: any = { companyId };
      if (!includeInactive) {
        where.isActive = true;
      }

      const categories = await prisma.documentCategory.findMany({
        where,
        include: {
          parent: true,
          children: {
            where: includeInactive ? {} : { isActive: true },
            orderBy: { sortOrder: 'asc' }
          },
          _count: {
            select: { documents: true }
          }
        },
        orderBy: [
          { path: 'asc' },
          { sortOrder: 'asc' }
        ]
      });

      return this.buildCategoryTree(categories);
    } catch (error) {
      logger.error('Failed to get document categories:', error);
      throw error;
    }
  }

  async updateCategory(id: string, data: Partial<CategoryData>, updatedBy?: string): Promise<any> {
    try {
      const category = await prisma.documentCategory.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          parentId: data.parentId,
          permissions: data.permissions,
          sortOrder: data.sortOrder,
          updatedBy
        },
        include: {
          parent: true,
          children: true
        }
      });

      // Update path if name or parent changed
      if (data.name || data.parentId !== undefined) {
        await this.updateCategoryPath(id);
      }

      return category;
    } catch (error) {
      logger.error('Failed to update document category:', error);
      throw error;
    }
  }

  async deleteCategory(id: string): Promise<void> {
    try {
      // Check if category has documents
      const documentCount = await prisma.document.count({
        where: { categoryId: id }
      });

      if (documentCount > 0) {
        throw new Error('Cannot delete category with existing documents');
      }

      // Check if category has children
      const childCount = await prisma.documentCategory.count({
        where: { parentId: id }
      });

      if (childCount > 0) {
        throw new Error('Cannot delete category with subcategories');
      }

      await prisma.documentCategory.delete({
        where: { id }
      });

      logger.info(`Document category deleted: ${id}`);
    } catch (error) {
      logger.error('Failed to delete document category:', error);
      throw error;
    }
  }

  // Document Type Management
  async createDocumentType(data: DocumentTypeData, createdBy?: string): Promise<any> {
    try {
      const documentType = await prisma.documentType.create({
        data: {
          name: data.name,
          description: data.description,
          fileExtensions: data.fileExtensions,
          maxFileSize: data.maxFileSize,
          requiresApproval: data.requiresApproval || false,
          approvalWorkflow: data.approvalWorkflow,
          reviewCycle: data.reviewCycle,
          retentionPeriod: data.retentionPeriod,
          formFields: data.formFields,
          companyId: data.companyId,
          createdBy
        }
      });

      logger.info(`Document type created: ${documentType.id}`, {
        name: data.name,
        companyId: data.companyId
      });

      return documentType;
    } catch (error) {
      logger.error('Failed to create document type:', error);
      throw error;
    }
  }

  async getDocumentTypes(companyId: string, includeInactive = false): Promise<any[]> {
    try {
      const where: any = { companyId };
      if (!includeInactive) {
        where.isActive = true;
      }

      const documentTypes = await prisma.documentType.findMany({
        where,
        include: {
          _count: {
            select: { documents: true }
          }
        },
        orderBy: { name: 'asc' }
      });

      return documentTypes;
    } catch (error) {
      logger.error('Failed to get document types:', error);
      throw error;
    }
  }

  async updateDocumentType(id: string, data: Partial<DocumentTypeData>, updatedBy?: string): Promise<any> {
    try {
      const documentType = await prisma.documentType.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          fileExtensions: data.fileExtensions,
          maxFileSize: data.maxFileSize,
          requiresApproval: data.requiresApproval,
          approvalWorkflow: data.approvalWorkflow,
          reviewCycle: data.reviewCycle,
          retentionPeriod: data.retentionPeriod,
          formFields: data.formFields,
          updatedBy
        }
      });

      return documentType;
    } catch (error) {
      logger.error('Failed to update document type:', error);
      throw error;
    }
  }

  async deleteDocumentType(id: string): Promise<void> {
    try {
      // Check if type has documents
      const documentCount = await prisma.document.count({
        where: { typeId: id }
      });

      if (documentCount > 0) {
        throw new Error('Cannot delete document type with existing documents');
      }

      await prisma.documentType.delete({
        where: { id }
      });

      logger.info(`Document type deleted: ${id}`);
    } catch (error) {
      logger.error('Failed to delete document type:', error);
      throw error;
    }
  }

  // Classification Utilities
  async classifyDocument(fileName: string, content?: string, companyId?: string): Promise<any> {
    try {
      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      
      // Find matching document types based on file extension
      const matchingTypes = await prisma.documentType.findMany({
        where: {
          fileExtensions: { has: `.${fileExtension}` },
          isActive: true,
          ...(companyId && { companyId })
        }
      });

      // Simple classification based on filename patterns
      const suggestions = {
        categories: await this.suggestCategories(fileName, content),
        types: matchingTypes,
        securityLevel: this.suggestSecurityLevel(fileName, content),
        tags: this.suggestTags(fileName, content)
      };

      return suggestions;
    } catch (error) {
      logger.error('Failed to classify document:', error);
      throw error;
    }
  }

  async getClassificationStats(companyId: string): Promise<any> {
    try {
      const [categoryStats, typeStats, securityStats] = await Promise.all([
        prisma.document.groupBy({
          by: ['categoryId'],
          where: { companyId, status: { not: 'DELETED' } },
          _count: true
        }),
        prisma.document.groupBy({
          by: ['typeId'],
          where: { companyId, status: { not: 'DELETED' } },
          _count: true
        }),
        prisma.document.groupBy({
          by: ['securityLevel'],
          where: { companyId, status: { not: 'DELETED' } },
          _count: true
        })
      ]);

      return {
        byCategory: categoryStats,
        byType: typeStats,
        bySecurityLevel: securityStats
      };
    } catch (error) {
      logger.error('Failed to get classification stats:', error);
      throw error;
    }
  }

  // Private Helper Methods
  private buildCategoryTree(categories: any[]): any[] {
    const categoryMap = new Map();
    const rootCategories: any[] = [];

    // Create map of all categories
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] });
    });

    // Build tree structure
    categories.forEach(category => {
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children.push(categoryMap.get(category.id));
        }
      } else {
        rootCategories.push(categoryMap.get(category.id));
      }
    });

    return rootCategories;
  }

  private async updateCategoryPath(categoryId: string): Promise<void> {
    try {
      const category = await prisma.documentCategory.findUnique({
        where: { id: categoryId },
        include: { parent: true }
      });

      if (!category) return;

      let path = `/${category.name.toLowerCase().replace(/\s+/g, '-')}`;
      
      if (category.parent) {
        path = `${category.parent.path}${path}`;
      }

      await prisma.documentCategory.update({
        where: { id: categoryId },
        data: { path }
      });

      // Update paths for all children
      const children = await prisma.documentCategory.findMany({
        where: { parentId: categoryId }
      });

      for (const child of children) {
        await this.updateCategoryPath(child.id);
      }
    } catch (error) {
      logger.error('Failed to update category path:', error);
    }
  }

  private async suggestCategories(fileName: string, content?: string): Promise<string[]> {
    const suggestions: string[] = [];
    const lowerFileName = fileName.toLowerCase();

    // Simple keyword-based suggestions
    if (lowerFileName.includes('policy') || lowerFileName.includes('procedure')) {
      suggestions.push('Policies & Procedures');
    }
    if (lowerFileName.includes('safety') || lowerFileName.includes('sds')) {
      suggestions.push('Safety');
    }
    if (lowerFileName.includes('training') || lowerFileName.includes('manual')) {
      suggestions.push('Training Materials');
    }
    if (lowerFileName.includes('form') || lowerFileName.includes('template')) {
      suggestions.push('Forms & Templates');
    }

    return suggestions;
  }

  private suggestSecurityLevel(fileName: string, content?: string): string {
    const lowerFileName = fileName.toLowerCase();

    if (lowerFileName.includes('confidential') || lowerFileName.includes('private')) {
      return 'CONFIDENTIAL';
    }
    if (lowerFileName.includes('restricted') || lowerFileName.includes('classified')) {
      return 'RESTRICTED';
    }
    if (lowerFileName.includes('public') || lowerFileName.includes('external')) {
      return 'PUBLIC';
    }

    return 'INTERNAL';
  }

  private suggestTags(fileName: string, content?: string): string[] {
    const tags: string[] = [];
    const lowerFileName = fileName.toLowerCase();

    // Extract potential tags from filename
    const commonTags = [
      'safety', 'training', 'policy', 'procedure', 'manual', 'guide',
      'form', 'template', 'report', 'analysis', 'compliance', 'audit'
    ];

    commonTags.forEach(tag => {
      if (lowerFileName.includes(tag)) {
        tags.push(tag);
      }
    });

    return tags;
  }
}

export default new DocumentClassificationService();

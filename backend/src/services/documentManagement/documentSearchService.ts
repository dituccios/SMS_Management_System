import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

export interface SearchQuery {
  query: string;
  companyId: string;
  filters?: {
    categoryIds?: string[];
    typeIds?: string[];
    securityLevels?: string[];
    tags?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
    fileTypes?: string[];
    authors?: string[];
    status?: string[];
  };
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  pagination?: {
    limit: number;
    offset: number;
  };
}

export interface SearchResult {
  documents: any[];
  total: number;
  facets: any;
  suggestions: string[];
  searchTime: number;
}

export interface IndexDocument {
  id: string;
  title: string;
  description?: string;
  content?: string;
  fileName: string;
  mimeType: string;
  categoryId: string;
  categoryName: string;
  typeId: string;
  typeName: string;
  securityLevel: string;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  fileSize: number;
  companyId: string;
}

export class DocumentSearchService {
  private searchIndex: Map<string, IndexDocument> = new Map();
  private invertedIndex: Map<string, Set<string>> = new Map();
  private isIndexing = false;

  constructor() {
    this.initializeIndex();
  }

  // Search Operations
  async search(searchQuery: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();
    
    try {
      // Build search criteria
      const searchCriteria = this.buildSearchCriteria(searchQuery);
      
      // Perform database search with full-text capabilities
      const [documents, total] = await Promise.all([
        this.performDatabaseSearch(searchCriteria, searchQuery.pagination),
        this.countSearchResults(searchCriteria)
      ]);

      // Generate facets for filtering
      const facets = await this.generateFacets(searchQuery.companyId, searchQuery.filters);

      // Generate search suggestions
      const suggestions = this.generateSuggestions(searchQuery.query);

      const searchTime = Date.now() - startTime;

      return {
        documents,
        total,
        facets,
        suggestions,
        searchTime
      };
    } catch (error) {
      logger.error('Search failed:', error);
      throw error;
    }
  }

  async advancedSearch(queries: Array<{
    field: string;
    operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'between';
    value: any;
    boost?: number;
  }>, companyId: string): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      const where: any = { companyId, status: { not: 'DELETED' } };
      const conditions: any[] = [];

      queries.forEach(query => {
        switch (query.operator) {
          case 'contains':
            if (query.field === 'content') {
              conditions.push({
                OR: [
                  { title: { contains: query.value, mode: 'insensitive' } },
                  { description: { contains: query.value, mode: 'insensitive' } },
                  { content: { contains: query.value, mode: 'insensitive' } }
                ]
              });
            } else {
              conditions.push({
                [query.field]: { contains: query.value, mode: 'insensitive' }
              });
            }
            break;
          case 'equals':
            conditions.push({ [query.field]: query.value });
            break;
          case 'startsWith':
            conditions.push({
              [query.field]: { startsWith: query.value, mode: 'insensitive' }
            });
            break;
          case 'endsWith':
            conditions.push({
              [query.field]: { endsWith: query.value, mode: 'insensitive' }
            });
            break;
          case 'gt':
            conditions.push({ [query.field]: { gt: query.value } });
            break;
          case 'lt':
            conditions.push({ [query.field]: { lt: query.value } });
            break;
          case 'between':
            conditions.push({
              [query.field]: { gte: query.value.start, lte: query.value.end }
            });
            break;
        }
      });

      if (conditions.length > 0) {
        where.AND = conditions;
      }

      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where,
          include: {
            category: true,
            type: true
          },
          orderBy: { updatedAt: 'desc' },
          take: 50
        }),
        prisma.document.count({ where })
      ]);

      const searchTime = Date.now() - startTime;

      return {
        documents,
        total,
        facets: {},
        suggestions: [],
        searchTime
      };
    } catch (error) {
      logger.error('Advanced search failed:', error);
      throw error;
    }
  }

  async searchSimilarDocuments(documentId: string, limit = 10): Promise<any[]> {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: { category: true, type: true }
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Find similar documents based on category, type, and tags
      const similarDocuments = await prisma.document.findMany({
        where: {
          id: { not: documentId },
          companyId: document.companyId,
          status: { not: 'DELETED' },
          OR: [
            { categoryId: document.categoryId },
            { typeId: document.typeId },
            { tags: { hasSome: document.tags } }
          ]
        },
        include: {
          category: true,
          type: true
        },
        take: limit,
        orderBy: { updatedAt: 'desc' }
      });

      return similarDocuments;
    } catch (error) {
      logger.error('Failed to find similar documents:', error);
      throw error;
    }
  }

  // Indexing Operations
  async indexDocument(document: any): Promise<void> {
    try {
      const indexDoc: IndexDocument = {
        id: document.id,
        title: document.title,
        description: document.description,
        content: document.content,
        fileName: document.fileName,
        mimeType: document.mimeType,
        categoryId: document.categoryId,
        categoryName: document.category?.name || '',
        typeId: document.typeId,
        typeName: document.type?.name || '',
        securityLevel: document.securityLevel,
        tags: document.tags || [],
        createdBy: document.createdBy,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        fileSize: document.fileSize,
        companyId: document.companyId
      };

      // Add to search index
      this.searchIndex.set(document.id, indexDoc);

      // Update inverted index
      this.updateInvertedIndex(indexDoc);

      logger.debug(`Document indexed: ${document.id}`);
    } catch (error) {
      logger.error('Failed to index document:', error);
    }
  }

  async removeFromIndex(documentId: string): Promise<void> {
    try {
      const indexDoc = this.searchIndex.get(documentId);
      if (indexDoc) {
        // Remove from inverted index
        this.removeFromInvertedIndex(indexDoc);
        
        // Remove from main index
        this.searchIndex.delete(documentId);
      }

      logger.debug(`Document removed from index: ${documentId}`);
    } catch (error) {
      logger.error('Failed to remove document from index:', error);
    }
  }

  async reindexAll(companyId?: string): Promise<void> {
    if (this.isIndexing) {
      logger.warn('Reindexing already in progress');
      return;
    }

    this.isIndexing = true;

    try {
      logger.info('Starting document reindexing', { companyId });

      const where: any = { status: { not: 'DELETED' } };
      if (companyId) {
        where.companyId = companyId;
      }

      const documents = await prisma.document.findMany({
        where,
        include: {
          category: true,
          type: true
        }
      });

      // Clear existing index for company or all
      if (companyId) {
        for (const [id, doc] of this.searchIndex.entries()) {
          if (doc.companyId === companyId) {
            this.searchIndex.delete(id);
          }
        }
      } else {
        this.searchIndex.clear();
        this.invertedIndex.clear();
      }

      // Reindex all documents
      for (const document of documents) {
        await this.indexDocument(document);
      }

      logger.info(`Reindexing completed: ${documents.length} documents`, { companyId });
    } catch (error) {
      logger.error('Failed to reindex documents:', error);
      throw error;
    } finally {
      this.isIndexing = false;
    }
  }

  // Search Analytics
  async getSearchAnalytics(companyId: string, dateRange?: { start: Date; end: Date }): Promise<any> {
    try {
      // This would typically be stored in a separate search_logs table
      // For now, return mock analytics
      return {
        totalSearches: 0,
        topQueries: [],
        topDocuments: [],
        searchTrends: [],
        averageSearchTime: 0
      };
    } catch (error) {
      logger.error('Failed to get search analytics:', error);
      throw error;
    }
  }

  // Private Helper Methods
  private async initializeIndex(): Promise<void> {
    try {
      // Load recent documents into memory index
      const recentDocuments = await prisma.document.findMany({
        where: {
          status: { not: 'DELETED' },
          updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        },
        include: {
          category: true,
          type: true
        },
        take: 1000
      });

      for (const document of recentDocuments) {
        await this.indexDocument(document);
      }

      logger.info(`Search index initialized with ${recentDocuments.length} documents`);
    } catch (error) {
      logger.error('Failed to initialize search index:', error);
    }
  }

  private buildSearchCriteria(searchQuery: SearchQuery): any {
    const where: any = {
      companyId: searchQuery.companyId,
      status: { not: 'DELETED' }
    };

    // Apply filters
    if (searchQuery.filters) {
      const filters = searchQuery.filters;

      if (filters.categoryIds?.length) {
        where.categoryId = { in: filters.categoryIds };
      }

      if (filters.typeIds?.length) {
        where.typeId = { in: filters.typeIds };
      }

      if (filters.securityLevels?.length) {
        where.securityLevel = { in: filters.securityLevels };
      }

      if (filters.tags?.length) {
        where.tags = { hasSome: filters.tags };
      }

      if (filters.authors?.length) {
        where.createdBy = { in: filters.authors };
      }

      if (filters.status?.length) {
        where.status = { in: filters.status };
      }

      if (filters.dateRange) {
        where.createdAt = {
          gte: filters.dateRange.start,
          lte: filters.dateRange.end
        };
      }

      if (filters.fileTypes?.length) {
        where.mimeType = { in: filters.fileTypes };
      }
    }

    // Add text search
    if (searchQuery.query) {
      where.OR = [
        { title: { contains: searchQuery.query, mode: 'insensitive' } },
        { description: { contains: searchQuery.query, mode: 'insensitive' } },
        { content: { contains: searchQuery.query, mode: 'insensitive' } },
        { fileName: { contains: searchQuery.query, mode: 'insensitive' } },
        { tags: { hasSome: [searchQuery.query] } }
      ];
    }

    return where;
  }

  private async performDatabaseSearch(criteria: any, pagination?: { limit: number; offset: number }): Promise<any[]> {
    const limit = pagination?.limit || 50;
    const offset = pagination?.offset || 0;

    return await prisma.document.findMany({
      where: criteria,
      include: {
        category: true,
        type: true
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset
    });
  }

  private async countSearchResults(criteria: any): Promise<number> {
    return await prisma.document.count({ where: criteria });
  }

  private async generateFacets(companyId: string, filters?: any): Promise<any> {
    try {
      const [categories, types, securityLevels, authors] = await Promise.all([
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
        }),
        prisma.document.groupBy({
          by: ['createdBy'],
          where: { companyId, status: { not: 'DELETED' } },
          _count: true
        })
      ]);

      return {
        categories,
        types,
        securityLevels,
        authors
      };
    } catch (error) {
      logger.error('Failed to generate facets:', error);
      return {};
    }
  }

  private generateSuggestions(query: string): string[] {
    // Simple suggestion generation based on common terms
    const suggestions: string[] = [];
    
    if (query.length < 3) {
      return suggestions;
    }

    // This would typically use a more sophisticated suggestion algorithm
    const commonTerms = ['policy', 'procedure', 'manual', 'guide', 'form', 'template', 'report'];
    
    commonTerms.forEach(term => {
      if (term.includes(query.toLowerCase()) && term !== query.toLowerCase()) {
        suggestions.push(term);
      }
    });

    return suggestions.slice(0, 5);
  }

  private updateInvertedIndex(document: IndexDocument): void {
    const terms = this.extractTerms(document);
    
    terms.forEach(term => {
      if (!this.invertedIndex.has(term)) {
        this.invertedIndex.set(term, new Set());
      }
      this.invertedIndex.get(term)!.add(document.id);
    });
  }

  private removeFromInvertedIndex(document: IndexDocument): void {
    const terms = this.extractTerms(document);
    
    terms.forEach(term => {
      const docSet = this.invertedIndex.get(term);
      if (docSet) {
        docSet.delete(document.id);
        if (docSet.size === 0) {
          this.invertedIndex.delete(term);
        }
      }
    });
  }

  private extractTerms(document: IndexDocument): string[] {
    const text = [
      document.title,
      document.description || '',
      document.content || '',
      document.fileName,
      document.categoryName,
      document.typeName,
      ...document.tags
    ].join(' ').toLowerCase();

    // Simple tokenization - in production, use a proper tokenizer
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2)
      .slice(0, 100); // Limit terms per document
  }
}

export default new DocumentSearchService();

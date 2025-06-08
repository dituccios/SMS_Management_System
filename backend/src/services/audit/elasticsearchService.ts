import { Client } from '@elastic/elasticsearch';
import { logger } from '../../utils/logger';
import { EventEmitter } from 'events';

export interface ElasticsearchConfig {
  node: string;
  auth?: {
    username: string;
    password: string;
  };
  tls?: {
    ca?: string;
    cert?: string;
    key?: string;
    rejectUnauthorized?: boolean;
  };
}

export interface SearchQuery {
  query?: any;
  filters?: any[];
  sort?: any[];
  size?: number;
  from?: number;
  aggs?: any;
}

export interface SearchResult {
  hits: {
    total: { value: number };
    hits: any[];
  };
  aggregations?: any;
  took: number;
}

export class ElasticsearchService extends EventEmitter {
  private client: Client;
  private readonly indexPrefix: string;
  private readonly isEnabled: boolean;

  constructor() {
    super();
    
    this.indexPrefix = process.env.ELASTICSEARCH_INDEX_PREFIX || 'sms-audit';
    this.isEnabled = process.env.ELASTICSEARCH_ENABLED === 'true';

    if (this.isEnabled) {
      this.initializeClient();
    }
  }

  private initializeClient(): void {
    try {
      const config: ElasticsearchConfig = {
        node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200'
      };

      if (process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD) {
        config.auth = {
          username: process.env.ELASTICSEARCH_USERNAME,
          password: process.env.ELASTICSEARCH_PASSWORD
        };
      }

      if (process.env.ELASTICSEARCH_CA_CERT) {
        config.tls = {
          ca: process.env.ELASTICSEARCH_CA_CERT,
          rejectUnauthorized: process.env.ELASTICSEARCH_TLS_REJECT_UNAUTHORIZED !== 'false'
        };
      }

      this.client = new Client(config);
      
      // Test connection
      this.testConnection();
      
      // Initialize indexes
      this.initializeIndexes();

      logger.info('Elasticsearch client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Elasticsearch client:', error);
      this.isEnabled = false;
    }
  }

  private async testConnection(): Promise<void> {
    try {
      const response = await this.client.ping();
      logger.info('Elasticsearch connection test successful');
    } catch (error) {
      logger.error('Elasticsearch connection test failed:', error);
      throw error;
    }
  }

  private async initializeIndexes(): Promise<void> {
    try {
      const indexes = [
        'audit-events',
        'audit-sessions',
        'audit-alerts',
        'audit-compliance'
      ];

      for (const index of indexes) {
        const indexName = `${this.indexPrefix}-${index}`;
        
        const exists = await this.client.indices.exists({ index: indexName });
        
        if (!exists) {
          await this.createIndex(indexName, this.getIndexMapping(index));
          logger.info(`Created Elasticsearch index: ${indexName}`);
        }
      }
    } catch (error) {
      logger.error('Failed to initialize Elasticsearch indexes:', error);
    }
  }

  private getIndexMapping(indexType: string): any {
    const baseMapping = {
      properties: {
        '@timestamp': { type: 'date' },
        eventId: { type: 'keyword' },
        timestamp: { type: 'date' },
        companyId: { type: 'keyword' },
        userId: { type: 'keyword' },
        userEmail: { type: 'keyword' },
        sessionId: { type: 'keyword' },
        ipAddress: { type: 'ip' },
        userAgent: { type: 'text', analyzer: 'standard' },
        requestId: { type: 'keyword' },
        correlationId: { type: 'keyword' }
      }
    };

    switch (indexType) {
      case 'audit-events':
        return {
          ...baseMapping,
          properties: {
            ...baseMapping.properties,
            eventType: { type: 'keyword' },
            category: { type: 'keyword' },
            severity: { type: 'keyword' },
            action: { type: 'keyword' },
            description: { type: 'text', analyzer: 'standard' },
            outcome: { type: 'keyword' },
            resourceType: { type: 'keyword' },
            resourceId: { type: 'keyword' },
            resourceName: { type: 'text', analyzer: 'standard' },
            tags: { type: 'keyword' },
            metadata: { type: 'object', enabled: false },
            oldValues: { type: 'object', enabled: false },
            newValues: { type: 'object', enabled: false },
            changedFields: { type: 'keyword' },
            checksum: { type: 'keyword' },
            digitalSignature: { type: 'keyword' }
          }
        };

      case 'audit-sessions':
        return {
          ...baseMapping,
          properties: {
            ...baseMapping.properties,
            startTime: { type: 'date' },
            endTime: { type: 'date' },
            duration: { type: 'integer' },
            isActive: { type: 'boolean' },
            authMethod: { type: 'keyword' },
            riskScore: { type: 'float' },
            anomalyFlags: { type: 'keyword' },
            eventCount: { type: 'integer' },
            lastActivity: { type: 'date' }
          }
        };

      case 'audit-alerts':
        return {
          ...baseMapping,
          properties: {
            ...baseMapping.properties,
            alertId: { type: 'keyword' },
            title: { type: 'text', analyzer: 'standard' },
            description: { type: 'text', analyzer: 'standard' },
            severity: { type: 'keyword' },
            category: { type: 'keyword' },
            status: { type: 'keyword' },
            triggerTime: { type: 'date' },
            resolvedAt: { type: 'date' },
            riskScore: { type: 'float' },
            alertData: { type: 'object', enabled: false }
          }
        };

      default:
        return baseMapping;
    }
  }

  private async createIndex(indexName: string, mapping: any): Promise<void> {
    try {
      await this.client.indices.create({
        index: indexName,
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 1,
            'index.lifecycle.name': 'audit-policy',
            'index.lifecycle.rollover_alias': `${indexName}-alias`
          },
          mappings: mapping
        }
      });
    } catch (error) {
      logger.error(`Failed to create index ${indexName}:`, error);
      throw error;
    }
  }

  // Document Indexing
  async indexAuditEvent(event: any): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const indexName = `${this.indexPrefix}-audit-events`;
      
      const document = {
        '@timestamp': new Date().toISOString(),
        ...event,
        // Add computed fields for better searching
        day: new Date(event.timestamp).toISOString().split('T')[0],
        hour: new Date(event.timestamp).getHours(),
        dayOfWeek: new Date(event.timestamp).getDay()
      };

      await this.client.index({
        index: indexName,
        id: event.eventId,
        body: document
      });

      logger.debug(`Indexed audit event: ${event.eventId}`);
    } catch (error) {
      logger.error('Failed to index audit event:', error);
    }
  }

  async bulkIndexAuditEvents(events: any[]): Promise<void> {
    if (!this.isEnabled || events.length === 0) return;

    try {
      const indexName = `${this.indexPrefix}-audit-events`;
      const body = [];

      for (const event of events) {
        body.push({
          index: {
            _index: indexName,
            _id: event.eventId
          }
        });

        body.push({
          '@timestamp': new Date().toISOString(),
          ...event,
          day: new Date(event.timestamp).toISOString().split('T')[0],
          hour: new Date(event.timestamp).getHours(),
          dayOfWeek: new Date(event.timestamp).getDay()
        });
      }

      const response = await this.client.bulk({ body });

      if (response.errors) {
        logger.warn('Some events failed to index:', response.items);
      }

      logger.debug(`Bulk indexed ${events.length} audit events`);
    } catch (error) {
      logger.error('Failed to bulk index audit events:', error);
    }
  }

  // Search Operations
  async searchAuditEvents(searchQuery: SearchQuery): Promise<SearchResult> {
    if (!this.isEnabled) {
      throw new Error('Elasticsearch is not enabled');
    }

    try {
      const indexName = `${this.indexPrefix}-audit-events`;
      
      const query = {
        index: indexName,
        body: {
          query: searchQuery.query || { match_all: {} },
          sort: searchQuery.sort || [{ timestamp: { order: 'desc' } }],
          size: searchQuery.size || 100,
          from: searchQuery.from || 0,
          aggs: searchQuery.aggs
        }
      };

      // Add filters if provided
      if (searchQuery.filters && searchQuery.filters.length > 0) {
        query.body.query = {
          bool: {
            must: query.body.query,
            filter: searchQuery.filters
          }
        };
      }

      const response = await this.client.search(query);
      
      return {
        hits: response.body.hits,
        aggregations: response.body.aggregations,
        took: response.body.took
      };
    } catch (error) {
      logger.error('Failed to search audit events:', error);
      throw error;
    }
  }

  async getAuditEventById(eventId: string): Promise<any> {
    if (!this.isEnabled) {
      throw new Error('Elasticsearch is not enabled');
    }

    try {
      const indexName = `${this.indexPrefix}-audit-events`;
      
      const response = await this.client.get({
        index: indexName,
        id: eventId
      });

      return response.body._source;
    } catch (error) {
      if (error.statusCode === 404) {
        return null;
      }
      logger.error('Failed to get audit event by ID:', error);
      throw error;
    }
  }

  // Analytics and Aggregations
  async getAuditAnalytics(companyId: string, dateRange: { start: Date; end: Date }): Promise<any> {
    if (!this.isEnabled) {
      throw new Error('Elasticsearch is not enabled');
    }

    try {
      const indexName = `${this.indexPrefix}-audit-events`;
      
      const response = await this.client.search({
        index: indexName,
        body: {
          query: {
            bool: {
              filter: [
                { term: { companyId } },
                {
                  range: {
                    timestamp: {
                      gte: dateRange.start.toISOString(),
                      lte: dateRange.end.toISOString()
                    }
                  }
                }
              ]
            }
          },
          size: 0,
          aggs: {
            events_over_time: {
              date_histogram: {
                field: 'timestamp',
                calendar_interval: 'hour'
              }
            },
            by_event_type: {
              terms: { field: 'eventType' }
            },
            by_category: {
              terms: { field: 'category' }
            },
            by_severity: {
              terms: { field: 'severity' }
            },
            by_outcome: {
              terms: { field: 'outcome' }
            },
            by_user: {
              terms: { field: 'userId', size: 10 }
            },
            by_resource_type: {
              terms: { field: 'resourceType' }
            }
          }
        }
      });

      return response.body.aggregations;
    } catch (error) {
      logger.error('Failed to get audit analytics:', error);
      throw error;
    }
  }

  // Index Management
  async deleteOldIndexes(retentionDays: number): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const response = await this.client.cat.indices({
        index: `${this.indexPrefix}-*`,
        format: 'json'
      });

      const indexes = response.body as any[];
      
      for (const index of indexes) {
        const indexDate = this.extractDateFromIndexName(index.index);
        if (indexDate && indexDate < cutoffDate) {
          await this.client.indices.delete({ index: index.index });
          logger.info(`Deleted old index: ${index.index}`);
        }
      }
    } catch (error) {
      logger.error('Failed to delete old indexes:', error);
    }
  }

  private extractDateFromIndexName(indexName: string): Date | null {
    // Extract date from index name pattern: sms-audit-audit-events-2024.01.01
    const dateMatch = indexName.match(/(\d{4}\.\d{2}\.\d{2})$/);
    if (dateMatch) {
      const dateStr = dateMatch[1].replace(/\./g, '-');
      return new Date(dateStr);
    }
    return null;
  }

  // Health Check
  async getClusterHealth(): Promise<any> {
    if (!this.isEnabled) {
      return { status: 'disabled' };
    }

    try {
      const response = await this.client.cluster.health();
      return response.body;
    } catch (error) {
      logger.error('Failed to get cluster health:', error);
      return { status: 'error', error: error.message };
    }
  }
}

export default new ElasticsearchService();

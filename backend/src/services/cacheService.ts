import Redis from 'ioredis';
import { logger } from '../utils/logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
  compress?: boolean;
  serialize?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  memoryUsage: number;
}

class CacheService {
  private redis: Redis;
  private isConnected = false;
  private stats = {
    hits: 0,
    misses: 0
  };

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.redis = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4,
      keyPrefix: 'sms:',
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis cache connected');
    });

    this.redis.on('error', (error) => {
      this.isConnected = false;
      logger.error('Redis cache error:', error);
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      logger.warn('Redis cache connection closed');
    });

    this.redis.on('reconnecting', () => {
      logger.info('Redis cache reconnecting...');
    });
  }

  async connect(): Promise<void> {
    try {
      await this.redis.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  // Basic cache operations
  async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    if (!this.isConnected) {
      logger.warn('Cache not available, skipping get operation');
      return null;
    }

    try {
      const fullKey = this.buildKey(key, options.prefix);
      const value = await this.redis.get(fullKey);

      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      
      if (options.serialize !== false) {
        return JSON.parse(value);
      }
      
      return value as T;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isConnected) {
      logger.warn('Cache not available, skipping set operation');
      return false;
    }

    try {
      const fullKey = this.buildKey(key, options.prefix);
      let serializedValue: string;

      if (options.serialize !== false) {
        serializedValue = JSON.stringify(value);
      } else {
        serializedValue = value;
      }

      if (options.ttl) {
        await this.redis.setex(fullKey, options.ttl, serializedValue);
      } else {
        await this.redis.set(fullKey, serializedValue);
      }

      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  async del(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key, options.prefix);
      const result = await this.redis.del(fullKey);
      return result > 0;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key, options.prefix);
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  async expire(key: string, ttl: number, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key, options.prefix);
      const result = await this.redis.expire(fullKey, ttl);
      return result === 1;
    } catch (error) {
      logger.error('Cache expire error:', error);
      return false;
    }
  }

  // Advanced cache operations
  async mget<T = any>(keys: string[], options: CacheOptions = {}): Promise<(T | null)[]> {
    if (!this.isConnected || keys.length === 0) {
      return keys.map(() => null);
    }

    try {
      const fullKeys = keys.map(key => this.buildKey(key, options.prefix));
      const values = await this.redis.mget(...fullKeys);

      return values.map(value => {
        if (value === null) {
          this.stats.misses++;
          return null;
        }

        this.stats.hits++;
        
        if (options.serialize !== false) {
          return JSON.parse(value);
        }
        
        return value as T;
      });
    } catch (error) {
      logger.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  async mset(keyValuePairs: Array<[string, any]>, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isConnected || keyValuePairs.length === 0) {
      return false;
    }

    try {
      const pipeline = this.redis.pipeline();

      for (const [key, value] of keyValuePairs) {
        const fullKey = this.buildKey(key, options.prefix);
        let serializedValue: string;

        if (options.serialize !== false) {
          serializedValue = JSON.stringify(value);
        } else {
          serializedValue = value;
        }

        if (options.ttl) {
          pipeline.setex(fullKey, options.ttl, serializedValue);
        } else {
          pipeline.set(fullKey, serializedValue);
        }
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error('Cache mset error:', error);
      return false;
    }
  }

  async invalidatePattern(pattern: string, options: CacheOptions = {}): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      const fullPattern = this.buildKey(pattern, options.prefix);
      const keys = await this.redis.keys(fullPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.redis.del(...keys);
      return result;
    } catch (error) {
      logger.error('Cache invalidate pattern error:', error);
      return 0;
    }
  }

  // Cache-aside pattern helpers
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Fetch from source
    const value = await fetchFunction();
    
    // Store in cache
    await this.set(key, value, options);
    
    return value;
  }

  // Specialized cache methods for SMS entities
  async cacheUser(userId: string, userData: any, ttl = 3600): Promise<void> {
    await this.set(`user:${userId}`, userData, { ttl, prefix: 'entity' });
  }

  async getCachedUser(userId: string): Promise<any> {
    return this.get(`user:${userId}`, { prefix: 'entity' });
  }

  async cacheDocument(documentId: string, documentData: any, ttl = 1800): Promise<void> {
    await this.set(`document:${documentId}`, documentData, { ttl, prefix: 'entity' });
  }

  async getCachedDocument(documentId: string): Promise<any> {
    return this.get(`document:${documentId}`, { prefix: 'entity' });
  }

  async cacheDocumentList(companyId: string, filters: any, documents: any[], ttl = 300): Promise<void> {
    const key = `documents:${companyId}:${this.hashFilters(filters)}`;
    await this.set(key, documents, { ttl, prefix: 'list' });
  }

  async getCachedDocumentList(companyId: string, filters: any): Promise<any[] | null> {
    const key = `documents:${companyId}:${this.hashFilters(filters)}`;
    return this.get(key, { prefix: 'list' });
  }

  async cacheDashboardData(companyId: string, dashboardData: any, ttl = 600): Promise<void> {
    await this.set(`dashboard:${companyId}`, dashboardData, { ttl, prefix: 'dashboard' });
  }

  async getCachedDashboardData(companyId: string): Promise<any> {
    return this.get(`dashboard:${companyId}`, { prefix: 'dashboard' });
  }

  // Session management
  async setSession(sessionId: string, sessionData: any, ttl = 86400): Promise<void> {
    await this.set(`session:${sessionId}`, sessionData, { ttl, prefix: 'session' });
  }

  async getSession(sessionId: string): Promise<any> {
    return this.get(`session:${sessionId}`, { prefix: 'session' });
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.del(`session:${sessionId}`, { prefix: 'session' });
  }

  // Rate limiting
  async incrementRateLimit(key: string, windowSize: number, limit: number): Promise<{ count: number; remaining: number; resetTime: number }> {
    if (!this.isConnected) {
      return { count: 0, remaining: limit, resetTime: Date.now() + windowSize * 1000 };
    }

    try {
      const fullKey = this.buildKey(`ratelimit:${key}`, 'rate');
      const pipeline = this.redis.pipeline();
      
      pipeline.incr(fullKey);
      pipeline.expire(fullKey, windowSize);
      
      const results = await pipeline.exec();
      const count = results?.[0]?.[1] as number || 0;
      
      return {
        count,
        remaining: Math.max(0, limit - count),
        resetTime: Date.now() + windowSize * 1000
      };
    } catch (error) {
      logger.error('Rate limit error:', error);
      return { count: 0, remaining: limit, resetTime: Date.now() + windowSize * 1000 };
    }
  }

  // Cache invalidation helpers
  async invalidateUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.del(`user:${userId}`, { prefix: 'entity' }),
      this.invalidatePattern(`*:${userId}:*`, { prefix: 'user' })
    ]);
  }

  async invalidateDocumentCache(documentId: string, companyId: string): Promise<void> {
    await Promise.all([
      this.del(`document:${documentId}`, { prefix: 'entity' }),
      this.invalidatePattern(`documents:${companyId}:*`, { prefix: 'list' }),
      this.del(`dashboard:${companyId}`, { prefix: 'dashboard' })
    ]);
  }

  async invalidateCompanyCache(companyId: string): Promise<void> {
    await Promise.all([
      this.invalidatePattern(`*:${companyId}:*`, { prefix: 'list' }),
      this.del(`dashboard:${companyId}`, { prefix: 'dashboard' })
    ]);
  }

  // Utility methods
  private buildKey(key: string, prefix?: string): string {
    if (prefix) {
      return `${prefix}:${key}`;
    }
    return key;
  }

  private hashFilters(filters: any): string {
    return Buffer.from(JSON.stringify(filters)).toString('base64');
  }

  async getStats(): Promise<CacheStats> {
    if (!this.isConnected) {
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: 0,
        totalKeys: 0,
        memoryUsage: 0
      };
    }

    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;
      
      const keysMatch = keyspace.match(/keys=(\d+)/);
      const totalKeys = keysMatch ? parseInt(keysMatch[1]) : 0;
      
      const total = this.stats.hits + this.stats.misses;
      const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: Math.round(hitRate * 100) / 100,
        totalKeys,
        memoryUsage
      };
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: 0,
        totalKeys: 0,
        memoryUsage: 0
      };
    }
  }

  async flush(): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.redis.flushdb();
      this.stats.hits = 0;
      this.stats.misses = 0;
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect();
      this.isConnected = false;
    }
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}

export default new CacheService();

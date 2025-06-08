import SQLite from 'react-native-sqlite-storage';
import NetInfo from '@react-native-netinfo/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from './apiService';

SQLite.DEBUG(false);
SQLite.enablePromise(true);

export interface OfflineAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  entityId?: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: 'PENDING' | 'SYNCING' | 'COMPLETED' | 'FAILED';
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: number;
  pendingActions: number;
  isSyncing: boolean;
  syncProgress: number;
}

class OfflineService {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;
  private syncInProgress = false;
  private syncListeners: Array<(status: SyncStatus) => void> = [];

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.db = await SQLite.openDatabase({
        name: 'sms_offline.db',
        location: 'default',
      });

      await this.createTables();
      this.setupNetworkListener();
      this.isInitialized = true;

      console.log('Offline service initialized');
    } catch (error) {
      console.error('Failed to initialize offline service:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tables = [
      // Offline actions queue
      `CREATE TABLE IF NOT EXISTS offline_actions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        entity TEXT NOT NULL,
        entity_id TEXT,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        status TEXT DEFAULT 'PENDING'
      )`,

      // Cached documents
      `CREATE TABLE IF NOT EXISTS cached_documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        content TEXT,
        category TEXT,
        type TEXT,
        status TEXT,
        created_at TEXT,
        updated_at TEXT,
        sync_status TEXT DEFAULT 'SYNCED'
      )`,

      // Cached incidents
      `CREATE TABLE IF NOT EXISTS cached_incidents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        severity TEXT,
        status TEXT,
        reporter_id TEXT,
        created_at TEXT,
        updated_at TEXT,
        sync_status TEXT DEFAULT 'SYNCED'
      )`,

      // Cached trainings
      `CREATE TABLE IF NOT EXISTS cached_trainings (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT,
        duration INTEGER,
        status TEXT,
        created_at TEXT,
        updated_at TEXT,
        sync_status TEXT DEFAULT 'SYNCED'
      )`,

      // Cached workflow tasks
      `CREATE TABLE IF NOT EXISTS cached_workflow_tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT,
        priority TEXT,
        assignee_id TEXT,
        due_date TEXT,
        created_at TEXT,
        updated_at TEXT,
        sync_status TEXT DEFAULT 'SYNCED'
      )`,

      // Sync metadata
      `CREATE TABLE IF NOT EXISTS sync_metadata (
        entity TEXT PRIMARY KEY,
        last_sync_time INTEGER,
        sync_token TEXT
      )`
    ];

    for (const table of tables) {
      await this.db.executeSql(table);
    }
  }

  private setupNetworkListener(): void {
    NetInfo.addEventListener(state => {
      if (state.isConnected && !this.syncInProgress) {
        this.syncPendingActions();
      }
      this.notifyListeners();
    });
  }

  // Queue offline actions
  async queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullAction: OfflineAction = {
      id: actionId,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'PENDING',
      ...action
    };

    await this.db.executeSql(
      `INSERT INTO offline_actions (id, type, entity, entity_id, data, timestamp, retry_count, max_retries, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fullAction.id,
        fullAction.type,
        fullAction.entity,
        fullAction.entityId || null,
        JSON.stringify(fullAction.data),
        fullAction.timestamp,
        fullAction.retryCount,
        fullAction.maxRetries,
        fullAction.status
      ]
    );

    console.log(`Queued offline action: ${action.type} ${action.entity}`);
    this.notifyListeners();

    // Try to sync immediately if online
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      this.syncPendingActions();
    }

    return actionId;
  }

  // Sync pending actions with server
  async syncPendingActions(): Promise<void> {
    if (!this.db || this.syncInProgress) return;

    try {
      this.syncInProgress = true;
      this.notifyListeners();

      const [results] = await this.db.executeSql(
        'SELECT * FROM offline_actions WHERE status = ? ORDER BY timestamp ASC',
        ['PENDING']
      );

      const actions: OfflineAction[] = [];
      for (let i = 0; i < results.rows.length; i++) {
        const row = results.rows.item(i);
        actions.push({
          id: row.id,
          type: row.type,
          entity: row.entity,
          entityId: row.entity_id,
          data: JSON.parse(row.data),
          timestamp: row.timestamp,
          retryCount: row.retry_count,
          maxRetries: row.max_retries,
          status: row.status
        });
      }

      let syncedCount = 0;
      for (const action of actions) {
        try {
          await this.syncAction(action);
          await this.markActionCompleted(action.id);
          syncedCount++;
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
          await this.handleActionFailure(action);
        }

        // Update progress
        this.notifyListeners();
      }

      // Update last sync time
      await AsyncStorage.setItem('lastSyncTime', Date.now().toString());

      console.log(`Synced ${syncedCount}/${actions.length} actions`);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.syncInProgress = false;
      this.notifyListeners();
    }
  }

  private async syncAction(action: OfflineAction): Promise<void> {
    // Mark as syncing
    await this.db!.executeSql(
      'UPDATE offline_actions SET status = ? WHERE id = ?',
      ['SYNCING', action.id]
    );

    switch (action.entity) {
      case 'documents':
        await this.syncDocumentAction(action);
        break;
      case 'incidents':
        await this.syncIncidentAction(action);
        break;
      case 'trainings':
        await this.syncTrainingAction(action);
        break;
      case 'workflow_tasks':
        await this.syncWorkflowTaskAction(action);
        break;
      default:
        throw new Error(`Unknown entity type: ${action.entity}`);
    }
  }

  private async syncDocumentAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'CREATE':
        await apiService.createDocument(action.data);
        break;
      case 'UPDATE':
        await apiService.updateDocument(action.entityId!, action.data);
        break;
      case 'DELETE':
        await apiService.deleteDocument(action.entityId!);
        break;
    }
  }

  private async syncIncidentAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'CREATE':
        await apiService.createIncident(action.data);
        break;
      case 'UPDATE':
        await apiService.updateIncident(action.entityId!, action.data);
        break;
      case 'DELETE':
        // Implement delete incident API
        break;
    }
  }

  private async syncTrainingAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'CREATE':
        // Implement create training API
        break;
      case 'UPDATE':
        // Implement update training API
        break;
      case 'DELETE':
        // Implement delete training API
        break;
    }
  }

  private async syncWorkflowTaskAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'UPDATE':
        await apiService.updateTaskStatus(action.entityId!, action.data.status);
        break;
      default:
        throw new Error(`Unsupported workflow task action: ${action.type}`);
    }
  }

  private async markActionCompleted(actionId: string): Promise<void> {
    await this.db!.executeSql(
      'UPDATE offline_actions SET status = ? WHERE id = ?',
      ['COMPLETED', actionId]
    );
  }

  private async handleActionFailure(action: OfflineAction): Promise<void> {
    const newRetryCount = action.retryCount + 1;
    
    if (newRetryCount >= action.maxRetries) {
      await this.db!.executeSql(
        'UPDATE offline_actions SET status = ?, retry_count = ? WHERE id = ?',
        ['FAILED', newRetryCount, action.id]
      );
    } else {
      await this.db!.executeSql(
        'UPDATE offline_actions SET status = ?, retry_count = ? WHERE id = ?',
        ['PENDING', newRetryCount, action.id]
      );
    }
  }

  // Cache management
  async cacheDocuments(documents: any[]): Promise<void> {
    if (!this.db) return;

    await this.db.executeSql('DELETE FROM cached_documents');
    
    for (const doc of documents) {
      await this.db.executeSql(
        `INSERT INTO cached_documents (id, title, description, content, category, type, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          doc.id,
          doc.title,
          doc.description || '',
          doc.content || '',
          doc.category,
          doc.type,
          doc.status,
          doc.createdAt,
          doc.updatedAt
        ]
      );
    }
  }

  async getCachedDocuments(): Promise<any[]> {
    if (!this.db) return [];

    const [results] = await this.db.executeSql('SELECT * FROM cached_documents ORDER BY updated_at DESC');
    const documents = [];
    
    for (let i = 0; i < results.rows.length; i++) {
      documents.push(results.rows.item(i));
    }
    
    return documents;
  }

  async cacheIncidents(incidents: any[]): Promise<void> {
    if (!this.db) return;

    await this.db.executeSql('DELETE FROM cached_incidents');
    
    for (const incident of incidents) {
      await this.db.executeSql(
        `INSERT INTO cached_incidents (id, title, description, severity, status, reporter_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          incident.id,
          incident.title,
          incident.description || '',
          incident.severity,
          incident.status,
          incident.reporterId,
          incident.createdAt,
          incident.updatedAt
        ]
      );
    }
  }

  async getCachedIncidents(): Promise<any[]> {
    if (!this.db) return [];

    const [results] = await this.db.executeSql('SELECT * FROM cached_incidents ORDER BY updated_at DESC');
    const incidents = [];
    
    for (let i = 0; i < results.rows.length; i++) {
      incidents.push(results.rows.item(i));
    }
    
    return incidents;
  }

  // Status and listeners
  async getSyncStatus(): Promise<SyncStatus> {
    const netInfo = await NetInfo.fetch();
    const lastSyncTime = parseInt(await AsyncStorage.getItem('lastSyncTime') || '0');
    
    let pendingActions = 0;
    if (this.db) {
      const [results] = await this.db.executeSql(
        'SELECT COUNT(*) as count FROM offline_actions WHERE status = ?',
        ['PENDING']
      );
      pendingActions = results.rows.item(0).count;
    }

    return {
      isOnline: netInfo.isConnected || false,
      lastSyncTime,
      pendingActions,
      isSyncing: this.syncInProgress,
      syncProgress: 0 // Calculate based on current sync progress
    };
  }

  addSyncListener(listener: (status: SyncStatus) => void): void {
    this.syncListeners.push(listener);
  }

  removeSyncListener(listener: (status: SyncStatus) => void): void {
    const index = this.syncListeners.indexOf(listener);
    if (index > -1) {
      this.syncListeners.splice(index, 1);
    }
  }

  private async notifyListeners(): Promise<void> {
    const status = await this.getSyncStatus();
    this.syncListeners.forEach(listener => listener(status));
  }

  // Cleanup
  async clearCache(): Promise<void> {
    if (!this.db) return;

    await this.db.executeSql('DELETE FROM cached_documents');
    await this.db.executeSql('DELETE FROM cached_incidents');
    await this.db.executeSql('DELETE FROM cached_trainings');
    await this.db.executeSql('DELETE FROM cached_workflow_tasks');
    await this.db.executeSql('DELETE FROM offline_actions WHERE status = ?', ['COMPLETED']);
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

export default new OfflineService();

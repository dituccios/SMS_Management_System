import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert, Linking } from 'react-native';
import apiService from './apiService';

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  type: 'DOCUMENT_EXPIRY' | 'INCIDENT_ALERT' | 'TRAINING_REMINDER' | 'WORKFLOW_TASK' | 'SECURITY_ALERT' | 'GENERAL';
  entityId?: string;
  entityType?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  actionUrl?: string;
  data?: any;
}

export interface NotificationSettings {
  enabled: boolean;
  documentExpiry: boolean;
  incidentAlerts: boolean;
  trainingReminders: boolean;
  workflowTasks: boolean;
  securityAlerts: boolean;
  generalNotifications: boolean;
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string;   // HH:MM format
  };
}

class NotificationService {
  private isInitialized = false;
  private fcmToken: string | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Request permission
      const authStatus = await messaging().requestPermission();
      const enabled = 
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.warn('Push notification permission not granted');
        return;
      }

      // Configure local notifications
      this.configurePushNotification();

      // Get FCM token
      await this.getFCMToken();

      // Set up message handlers
      this.setupMessageHandlers();

      // Subscribe to topics
      await this.subscribeToTopics();

      this.isInitialized = true;
      console.log('Notification service initialized');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      throw error;
    }
  }

  private configurePushNotification(): void {
    PushNotification.configure({
      onRegister: (token) => {
        console.log('Push notification token:', token);
      },

      onNotification: (notification) => {
        console.log('Local notification received:', notification);
        
        if (notification.userInteraction) {
          this.handleNotificationTap(notification);
        }

        // Required on iOS only
        notification.finish(PushNotification.FetchResult.NoData);
      },

      onAction: (notification) => {
        console.log('Notification action:', notification.action);
        this.handleNotificationAction(notification);
      },

      onRegistrationError: (err) => {
        console.error('Push notification registration error:', err);
      },

      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    // Create notification channels for Android
    if (Platform.OS === 'android') {
      this.createNotificationChannels();
    }
  }

  private createNotificationChannels(): void {
    const channels = [
      {
        channelId: 'sms-urgent',
        channelName: 'Urgent Alerts',
        channelDescription: 'Critical security and safety alerts',
        importance: 4,
        vibrate: true,
        sound: 'default',
      },
      {
        channelId: 'sms-high',
        channelName: 'High Priority',
        channelDescription: 'Important notifications requiring attention',
        importance: 3,
        vibrate: true,
        sound: 'default',
      },
      {
        channelId: 'sms-normal',
        channelName: 'Normal',
        channelDescription: 'General notifications',
        importance: 2,
        vibrate: false,
        sound: 'default',
      },
      {
        channelId: 'sms-low',
        channelName: 'Low Priority',
        channelDescription: 'Informational notifications',
        importance: 1,
        vibrate: false,
        sound: null,
      },
    ];

    channels.forEach(channel => {
      PushNotification.createChannel(channel, () => {});
    });
  }

  private async getFCMToken(): Promise<void> {
    try {
      const token = await messaging().getToken();
      this.fcmToken = token;
      
      // Store token locally
      await AsyncStorage.setItem('fcmToken', token);
      
      // Send token to server
      await this.registerTokenWithServer(token);
      
      console.log('FCM Token:', token);
    } catch (error) {
      console.error('Failed to get FCM token:', error);
    }
  }

  private setupMessageHandlers(): void {
    // Handle background/quit state messages
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Background message received:', remoteMessage);
      await this.processRemoteMessage(remoteMessage);
    });

    // Handle foreground messages
    messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground message received:', remoteMessage);
      await this.processRemoteMessage(remoteMessage, true);
    });

    // Handle notification opened app
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Notification opened app:', remoteMessage);
      this.handleNotificationTap(remoteMessage);
    });

    // Check if app was opened from a notification
    messaging().getInitialNotification().then((remoteMessage) => {
      if (remoteMessage) {
        console.log('App opened from notification:', remoteMessage);
        this.handleNotificationTap(remoteMessage);
      }
    });

    // Handle token refresh
    messaging().onTokenRefresh(async (token) => {
      console.log('FCM token refreshed:', token);
      this.fcmToken = token;
      await AsyncStorage.setItem('fcmToken', token);
      await this.registerTokenWithServer(token);
    });
  }

  private async processRemoteMessage(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
    showInForeground = false
  ): Promise<void> {
    const { notification, data } = remoteMessage;
    
    if (!notification) return;

    const notificationData: NotificationData = {
      id: data?.id || Date.now().toString(),
      title: notification.title || 'SMS Notification',
      body: notification.body || '',
      type: (data?.type as any) || 'GENERAL',
      entityId: data?.entityId,
      entityType: data?.entityType,
      priority: (data?.priority as any) || 'NORMAL',
      actionUrl: data?.actionUrl,
      data: data ? JSON.parse(data.customData || '{}') : undefined,
    };

    // Check notification settings
    const settings = await this.getNotificationSettings();
    if (!this.shouldShowNotification(notificationData, settings)) {
      return;
    }

    // Show local notification if in foreground
    if (showInForeground) {
      this.showLocalNotification(notificationData);
    }

    // Store notification for history
    await this.storeNotification(notificationData);
  }

  private shouldShowNotification(notification: NotificationData, settings: NotificationSettings): boolean {
    if (!settings.enabled) return false;

    // Check quiet hours
    if (settings.quietHours.enabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (currentTime >= settings.quietHours.startTime && currentTime <= settings.quietHours.endTime) {
        // Only show urgent notifications during quiet hours
        return notification.priority === 'URGENT';
      }
    }

    // Check type-specific settings
    switch (notification.type) {
      case 'DOCUMENT_EXPIRY':
        return settings.documentExpiry;
      case 'INCIDENT_ALERT':
        return settings.incidentAlerts;
      case 'TRAINING_REMINDER':
        return settings.trainingReminders;
      case 'WORKFLOW_TASK':
        return settings.workflowTasks;
      case 'SECURITY_ALERT':
        return settings.securityAlerts;
      case 'GENERAL':
        return settings.generalNotifications;
      default:
        return true;
    }
  }

  private showLocalNotification(notification: NotificationData): void {
    const channelId = this.getChannelId(notification.priority);
    
    PushNotification.localNotification({
      id: notification.id,
      title: notification.title,
      message: notification.body,
      channelId,
      priority: this.getPriorityValue(notification.priority),
      importance: this.getImportanceValue(notification.priority),
      vibrate: notification.priority === 'URGENT' || notification.priority === 'HIGH',
      playSound: true,
      soundName: 'default',
      userInfo: {
        id: notification.id,
        type: notification.type,
        entityId: notification.entityId,
        entityType: notification.entityType,
        actionUrl: notification.actionUrl,
        data: notification.data,
      },
      actions: this.getNotificationActions(notification),
    });
  }

  private getChannelId(priority: string): string {
    switch (priority) {
      case 'URGENT': return 'sms-urgent';
      case 'HIGH': return 'sms-high';
      case 'NORMAL': return 'sms-normal';
      case 'LOW': return 'sms-low';
      default: return 'sms-normal';
    }
  }

  private getPriorityValue(priority: string): 'max' | 'high' | 'default' | 'low' | 'min' {
    switch (priority) {
      case 'URGENT': return 'max';
      case 'HIGH': return 'high';
      case 'NORMAL': return 'default';
      case 'LOW': return 'low';
      default: return 'default';
    }
  }

  private getImportanceValue(priority: string): 'max' | 'high' | 'default' | 'low' | 'min' {
    return this.getPriorityValue(priority);
  }

  private getNotificationActions(notification: NotificationData): string[] {
    const actions = [];
    
    switch (notification.type) {
      case 'WORKFLOW_TASK':
        actions.push('Complete', 'View');
        break;
      case 'INCIDENT_ALERT':
        actions.push('Acknowledge', 'View');
        break;
      case 'TRAINING_REMINDER':
        actions.push('Start Training', 'Remind Later');
        break;
      default:
        actions.push('View');
    }
    
    return actions;
  }

  private handleNotificationTap(notification: any): void {
    const { userInfo, data } = notification;
    const notificationData = userInfo || data;
    
    if (notificationData?.actionUrl) {
      // Navigate to specific screen
      this.navigateToScreen(notificationData.actionUrl);
    } else if (notificationData?.entityType && notificationData?.entityId) {
      // Navigate to entity detail
      this.navigateToEntity(notificationData.entityType, notificationData.entityId);
    }
  }

  private handleNotificationAction(notification: any): void {
    const { action, userInfo } = notification;
    
    switch (action) {
      case 'Complete':
        this.handleCompleteAction(userInfo);
        break;
      case 'Acknowledge':
        this.handleAcknowledgeAction(userInfo);
        break;
      case 'Start Training':
        this.handleStartTrainingAction(userInfo);
        break;
      case 'Remind Later':
        this.handleRemindLaterAction(userInfo);
        break;
      default:
        this.handleNotificationTap(notification);
    }
  }

  private async handleCompleteAction(userInfo: any): Promise<void> {
    if (userInfo.type === 'WORKFLOW_TASK' && userInfo.entityId) {
      try {
        await apiService.updateTaskStatus(userInfo.entityId, 'COMPLETED');
        this.showLocalNotification({
          id: Date.now().toString(),
          title: 'Task Completed',
          body: 'Task has been marked as completed',
          type: 'GENERAL',
          priority: 'LOW'
        });
      } catch (error) {
        console.error('Failed to complete task:', error);
      }
    }
  }

  private async handleAcknowledgeAction(userInfo: any): Promise<void> {
    // Implement incident acknowledgment
    console.log('Acknowledging incident:', userInfo.entityId);
  }

  private handleStartTrainingAction(userInfo: any): void {
    if (userInfo.entityId) {
      this.navigateToEntity('training', userInfo.entityId);
    }
  }

  private async handleRemindLaterAction(userInfo: any): Promise<void> {
    // Schedule reminder for later
    const remindTime = new Date();
    remindTime.setHours(remindTime.getHours() + 1);
    
    this.scheduleLocalNotification({
      id: `remind_${userInfo.id}`,
      title: userInfo.title || 'Training Reminder',
      body: 'Don\'t forget about your training',
      type: 'TRAINING_REMINDER',
      priority: 'NORMAL',
      entityId: userInfo.entityId,
      entityType: userInfo.entityType
    }, remindTime);
  }

  private navigateToScreen(url: string): void {
    // Implement navigation logic
    console.log('Navigating to:', url);
  }

  private navigateToEntity(entityType: string, entityId: string): void {
    // Implement entity navigation logic
    console.log('Navigating to entity:', entityType, entityId);
  }

  // Public methods
  async scheduleLocalNotification(notification: NotificationData, date: Date): Promise<void> {
    PushNotification.localNotificationSchedule({
      id: notification.id,
      title: notification.title,
      message: notification.body,
      date,
      channelId: this.getChannelId(notification.priority),
      userInfo: {
        id: notification.id,
        type: notification.type,
        entityId: notification.entityId,
        entityType: notification.entityType,
        actionUrl: notification.actionUrl,
        data: notification.data,
      },
    });
  }

  async cancelNotification(notificationId: string): Promise<void> {
    PushNotification.cancelLocalNotifications({ id: notificationId });
  }

  async cancelAllNotifications(): Promise<void> {
    PushNotification.cancelAllLocalNotifications();
  }

  async getNotificationSettings(): Promise<NotificationSettings> {
    try {
      const settings = await AsyncStorage.getItem('notificationSettings');
      return settings ? JSON.parse(settings) : this.getDefaultSettings();
    } catch (error) {
      console.error('Failed to get notification settings:', error);
      return this.getDefaultSettings();
    }
  }

  async updateNotificationSettings(settings: NotificationSettings): Promise<void> {
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(settings));
      
      // Update server settings
      await apiService.put('/users/notification-settings', settings);
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      throw error;
    }
  }

  private getDefaultSettings(): NotificationSettings {
    return {
      enabled: true,
      documentExpiry: true,
      incidentAlerts: true,
      trainingReminders: true,
      workflowTasks: true,
      securityAlerts: true,
      generalNotifications: true,
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
      },
    };
  }

  private async subscribeToTopics(): Promise<void> {
    try {
      // Subscribe to general topics
      await messaging().subscribeToTopic('sms_general');
      await messaging().subscribeToTopic('sms_security');
      
      console.log('Subscribed to notification topics');
    } catch (error) {
      console.error('Failed to subscribe to topics:', error);
    }
  }

  private async registerTokenWithServer(token: string): Promise<void> {
    try {
      await apiService.post('/users/fcm-token', { token });
    } catch (error) {
      console.error('Failed to register FCM token with server:', error);
    }
  }

  private async storeNotification(notification: NotificationData): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('notificationHistory');
      const history = stored ? JSON.parse(stored) : [];
      
      history.unshift({
        ...notification,
        receivedAt: new Date().toISOString(),
        read: false,
      });
      
      // Keep only last 100 notifications
      if (history.length > 100) {
        history.splice(100);
      }
      
      await AsyncStorage.setItem('notificationHistory', JSON.stringify(history));
    } catch (error) {
      console.error('Failed to store notification:', error);
    }
  }

  async getNotificationHistory(): Promise<any[]> {
    try {
      const stored = await AsyncStorage.getItem('notificationHistory');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get notification history:', error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('notificationHistory');
      const history = stored ? JSON.parse(stored) : [];
      
      const notification = history.find((n: any) => n.id === notificationId);
      if (notification) {
        notification.read = true;
        await AsyncStorage.setItem('notificationHistory', JSON.stringify(history));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  getFCMToken(): string | null {
    return this.fcmToken;
  }
}

export default new NotificationService();

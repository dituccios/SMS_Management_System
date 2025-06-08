import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface SocketUser {
  id: string;
  email: string;
  role: string;
  companyId: string;
  socketId: string;
  connectedAt: Date;
  lastActivity: Date;
}

export interface RealTimeEvent {
  type: string;
  data: any;
  userId?: string;
  companyId?: string;
  timestamp: Date;
  metadata?: any;
}

export class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, SocketUser> = new Map();
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.startHeartbeat();
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          include: { company: true }
        });

        if (!user || !user.isActive) {
          return next(new Error('Invalid or inactive user'));
        }

        socket.data.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          company: user.company
        };

        next();
      } catch (error) {
        logger.error('WebSocket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);

      // Document collaboration events
      socket.on('document:join', (data) => this.handleDocumentJoin(socket, data));
      socket.on('document:leave', (data) => this.handleDocumentLeave(socket, data));
      socket.on('document:edit', (data) => this.handleDocumentEdit(socket, data));
      socket.on('document:cursor', (data) => this.handleDocumentCursor(socket, data));

      // Incident real-time events
      socket.on('incident:subscribe', (data) => this.handleIncidentSubscribe(socket, data));
      socket.on('incident:update', (data) => this.handleIncidentUpdate(socket, data));

      // Workflow events
      socket.on('workflow:subscribe', (data) => this.handleWorkflowSubscribe(socket, data));
      socket.on('workflow:task_update', (data) => this.handleWorkflowTaskUpdate(socket, data));

      // Chat/messaging events
      socket.on('chat:join_room', (data) => this.handleChatJoinRoom(socket, data));
      socket.on('chat:send_message', (data) => this.handleChatSendMessage(socket, data));
      socket.on('chat:typing', (data) => this.handleChatTyping(socket, data));

      // Notification events
      socket.on('notifications:subscribe', () => this.handleNotificationSubscribe(socket));
      socket.on('notifications:mark_read', (data) => this.handleNotificationMarkRead(socket, data));

      // Activity tracking
      socket.on('activity:heartbeat', () => this.handleActivityHeartbeat(socket));

      // Disconnect handler
      socket.on('disconnect', () => this.handleDisconnection(socket));
    });
  }

  private handleConnection(socket: any): void {
    const user = socket.data.user;
    const socketUser: SocketUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      socketId: socket.id,
      connectedAt: new Date(),
      lastActivity: new Date()
    };

    // Store user connection
    this.connectedUsers.set(socket.id, socketUser);
    
    // Track user sockets
    if (!this.userSockets.has(user.id)) {
      this.userSockets.set(user.id, new Set());
    }
    this.userSockets.get(user.id)!.add(socket.id);

    // Join company room
    socket.join(`company:${user.companyId}`);

    // Join user-specific room
    socket.join(`user:${user.id}`);

    // Emit connection success
    socket.emit('connected', {
      userId: user.id,
      timestamp: new Date(),
      onlineUsers: this.getOnlineUsersForCompany(user.companyId)
    });

    // Broadcast user online status to company
    this.broadcastToCompany(user.companyId, 'user:online', {
      userId: user.id,
      email: user.email,
      timestamp: new Date()
    }, socket.id);

    logger.info(`User ${user.email} connected via WebSocket`, {
      socketId: socket.id,
      userId: user.id,
      companyId: user.companyId
    });
  }

  private handleDisconnection(socket: any): void {
    const socketUser = this.connectedUsers.get(socket.id);
    if (!socketUser) return;

    // Remove from connected users
    this.connectedUsers.delete(socket.id);

    // Remove from user sockets
    const userSockets = this.userSockets.get(socketUser.id);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        this.userSockets.delete(socketUser.id);
        
        // Broadcast user offline status if no more connections
        this.broadcastToCompany(socketUser.companyId, 'user:offline', {
          userId: socketUser.id,
          email: socketUser.email,
          timestamp: new Date()
        });
      }
    }

    logger.info(`User ${socketUser.email} disconnected from WebSocket`, {
      socketId: socket.id,
      userId: socketUser.id,
      sessionDuration: Date.now() - socketUser.connectedAt.getTime()
    });
  }

  // Document collaboration handlers
  private handleDocumentJoin(socket: any, data: { documentId: string }): void {
    const user = socket.data.user;
    const room = `document:${data.documentId}`;
    
    socket.join(room);
    
    // Broadcast user joined document
    socket.to(room).emit('document:user_joined', {
      userId: user.id,
      email: user.email,
      documentId: data.documentId,
      timestamp: new Date()
    });

    // Send current collaborators
    const collaborators = this.getDocumentCollaborators(data.documentId);
    socket.emit('document:collaborators', { collaborators });
  }

  private handleDocumentLeave(socket: any, data: { documentId: string }): void {
    const user = socket.data.user;
    const room = `document:${data.documentId}`;
    
    socket.leave(room);
    
    // Broadcast user left document
    socket.to(room).emit('document:user_left', {
      userId: user.id,
      email: user.email,
      documentId: data.documentId,
      timestamp: new Date()
    });
  }

  private handleDocumentEdit(socket: any, data: any): void {
    const user = socket.data.user;
    const room = `document:${data.documentId}`;
    
    // Broadcast edit to other collaborators
    socket.to(room).emit('document:edit', {
      ...data,
      userId: user.id,
      timestamp: new Date()
    });

    // Store edit in database for conflict resolution
    this.storeDocumentEdit(data);
  }

  private handleDocumentCursor(socket: any, data: any): void {
    const user = socket.data.user;
    const room = `document:${data.documentId}`;
    
    // Broadcast cursor position to other collaborators
    socket.to(room).emit('document:cursor', {
      userId: user.id,
      email: user.email,
      position: data.position,
      selection: data.selection,
      timestamp: new Date()
    });
  }

  // Incident handlers
  private handleIncidentSubscribe(socket: any, data: { incidentId: string }): void {
    socket.join(`incident:${data.incidentId}`);
  }

  private handleIncidentUpdate(socket: any, data: any): void {
    const user = socket.data.user;
    const room = `incident:${data.incidentId}`;
    
    // Broadcast incident update
    this.io.to(room).emit('incident:updated', {
      ...data,
      updatedBy: {
        id: user.id,
        email: user.email
      },
      timestamp: new Date()
    });

    // Also broadcast to company for critical incidents
    if (data.severity === 'CRITICAL') {
      this.broadcastToCompany(user.companyId, 'incident:critical_update', data);
    }
  }

  // Workflow handlers
  private handleWorkflowSubscribe(socket: any, data: { workflowId: string }): void {
    socket.join(`workflow:${data.workflowId}`);
  }

  private handleWorkflowTaskUpdate(socket: any, data: any): void {
    const user = socket.data.user;
    const room = `workflow:${data.workflowId}`;
    
    // Broadcast task update
    this.io.to(room).emit('workflow:task_updated', {
      ...data,
      updatedBy: {
        id: user.id,
        email: user.email
      },
      timestamp: new Date()
    });

    // Notify task assignee if different from updater
    if (data.assigneeId && data.assigneeId !== user.id) {
      this.sendToUser(data.assigneeId, 'workflow:task_assigned', data);
    }
  }

  // Chat handlers
  private handleChatJoinRoom(socket: any, data: { roomId: string, roomType: 'incident' | 'workflow' | 'general' }): void {
    const room = `chat:${data.roomType}:${data.roomId}`;
    socket.join(room);
  }

  private async handleChatSendMessage(socket: any, data: any): Promise<void> {
    const user = socket.data.user;
    const room = `chat:${data.roomType}:${data.roomId}`;
    
    // Store message in database
    const message = await prisma.chatMessage.create({
      data: {
        content: data.content,
        roomId: data.roomId,
        roomType: data.roomType,
        senderId: user.id,
        timestamp: new Date()
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Broadcast message to room
    this.io.to(room).emit('chat:message', {
      id: message.id,
      content: message.content,
      sender: message.sender,
      timestamp: message.timestamp,
      roomId: data.roomId,
      roomType: data.roomType
    });
  }

  private handleChatTyping(socket: any, data: any): void {
    const user = socket.data.user;
    const room = `chat:${data.roomType}:${data.roomId}`;
    
    // Broadcast typing indicator
    socket.to(room).emit('chat:typing', {
      userId: user.id,
      email: user.email,
      isTyping: data.isTyping,
      timestamp: new Date()
    });
  }

  // Notification handlers
  private handleNotificationSubscribe(socket: any): void {
    const user = socket.data.user;
    socket.join(`notifications:${user.id}`);
  }

  private handleNotificationMarkRead(socket: any, data: { notificationId: string }): void {
    // Update notification as read in database
    this.markNotificationAsRead(data.notificationId);
  }

  private handleActivityHeartbeat(socket: any): void {
    const socketUser = this.connectedUsers.get(socket.id);
    if (socketUser) {
      socketUser.lastActivity = new Date();
    }
  }

  // Public methods for broadcasting events
  public broadcastToCompany(companyId: string, event: string, data: any, excludeSocketId?: string): void {
    const room = `company:${companyId}`;
    if (excludeSocketId) {
      this.io.to(room).except(excludeSocketId).emit(event, data);
    } else {
      this.io.to(room).emit(event, data);
    }
  }

  public sendToUser(userId: string, event: string, data: any): void {
    const room = `user:${userId}`;
    this.io.to(room).emit(event, data);
  }

  public broadcastNotification(userId: string, notification: any): void {
    this.sendToUser(userId, 'notification:new', notification);
  }

  public broadcastSystemAlert(companyId: string, alert: any): void {
    this.broadcastToCompany(companyId, 'system:alert', alert);
  }

  // Utility methods
  private getOnlineUsersForCompany(companyId: string): any[] {
    const onlineUsers = [];
    for (const [socketId, user] of this.connectedUsers) {
      if (user.companyId === companyId) {
        onlineUsers.push({
          id: user.id,
          email: user.email,
          role: user.role,
          connectedAt: user.connectedAt,
          lastActivity: user.lastActivity
        });
      }
    }
    return onlineUsers;
  }

  private getDocumentCollaborators(documentId: string): any[] {
    const collaborators = [];
    const room = this.io.sockets.adapter.rooms.get(`document:${documentId}`);
    
    if (room) {
      for (const socketId of room) {
        const user = this.connectedUsers.get(socketId);
        if (user) {
          collaborators.push({
            id: user.id,
            email: user.email,
            socketId: user.socketId
          });
        }
      }
    }
    
    return collaborators;
  }

  private async storeDocumentEdit(editData: any): Promise<void> {
    try {
      await prisma.documentEdit.create({
        data: {
          documentId: editData.documentId,
          userId: editData.userId,
          operation: editData.operation,
          content: editData.content,
          position: editData.position,
          timestamp: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to store document edit:', error);
    }
  }

  private async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await prisma.notification.update({
        where: { id: notificationId },
        data: { readAt: new Date() }
      });
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
    }
  }

  private startHeartbeat(): void {
    setInterval(() => {
      const now = new Date();
      const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

      for (const [socketId, user] of this.connectedUsers) {
        if (now.getTime() - user.lastActivity.getTime() > inactiveThreshold) {
          // Mark user as inactive or disconnect
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('activity:inactive_warning');
          }
        }
      }
    }, 60000); // Check every minute
  }

  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  public getCompanyUsersCount(companyId: string): number {
    let count = 0;
    for (const [, user] of this.connectedUsers) {
      if (user.companyId === companyId) {
        count++;
      }
    }
    return count;
  }

  public isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }
}

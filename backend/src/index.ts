import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import smsRoutes from './routes/sms';
import mlRoutes from './routes/ml';
import riskTrainingRoutes from './routes/riskTraining';
import complianceRoutes from './routes/compliance';
import auditTrailRoutes from './routes/auditTrail';
import documentManagementRoutes from './routes/documentManagement';
import systemIntegrationRoutes from './routes/systemIntegration';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Initialize Prisma client
const prisma = new PrismaClient();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'SMS Management API',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
const apiPrefix = process.env.API_PREFIX || '/api';
const apiVersion = process.env.API_VERSION || 'v1';
const baseRoute = `${apiPrefix}/${apiVersion}`;

app.use(`${baseRoute}/auth`, authRoutes);
app.use(`${baseRoute}/users`, userRoutes);
app.use(`${baseRoute}/sms`, smsRoutes);
app.use(`${baseRoute}/ml`, mlRoutes);
app.use(`${baseRoute}/risk-training`, riskTrainingRoutes);
app.use(`${baseRoute}/compliance`, complianceRoutes);
app.use(`${baseRoute}/audit`, auditTrailRoutes);
app.use(`${baseRoute}/documents`, documentManagementRoutes);
app.use(`${baseRoute}/integrations`, systemIntegrationRoutes);

// API documentation endpoint
app.get(`${baseRoute}`, (req, res) => {
  res.json({
    name: 'SMS Management API',
    version: '1.0.0',
    description: 'Safety Management System API',
    endpoints: {
      auth: `${baseRoute}/auth`,
      users: `${baseRoute}/users`,
      sms: `${baseRoute}/sms`,
    },
    documentation: 'https://docs.sms-management.com',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested route ${req.originalUrl} does not exist.`,
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  logger.info(`🛡️ SMS Management API server running on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`📚 API docs: http://localhost:${PORT}${baseRoute}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;

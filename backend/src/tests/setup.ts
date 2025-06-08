import { PrismaClient } from '@prisma/client';

// Global test setup
const prisma = new PrismaClient();

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/sms_test';
process.env.CONFIG_ENCRYPTION_KEY = 'test-config-encryption-key';
process.env.INTEGRATION_ENCRYPTION_KEY = 'test-integration-encryption-key';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global setup before all tests
beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
});

// Global cleanup after all tests
afterAll(async () => {
  // Disconnect from test database
  await prisma.$disconnect();
});

// Export for use in tests
export { prisma };

// Jest setup for integration tests
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '.env.test') });

// Set test timeout for all tests
jest.setTimeout(300000); // 5 minutes

// Global test configuration
global.TEST_CONFIG = {
  TIMEOUT: {
    SHORT: 30000,    // 30 seconds
    MEDIUM: 120000,  // 2 minutes
    LONG: 300000     // 5 minutes
  },
  RETRY: {
    COUNT: 3,
    DELAY: 5000      // 5 seconds
  }
};

// Mock console methods for cleaner test output
const originalConsole = { ...console };

beforeAll(() => {
  // Suppress logs during tests unless DEBUG is set
  if (!process.env.DEBUG) {
    console.log = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();
  }
});

afterAll(() => {
  // Restore console
  if (!process.env.DEBUG) {
    Object.assign(console, originalConsole);
  }
});

// Add custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Global error handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

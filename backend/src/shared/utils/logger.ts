/**
 * Environment-aware logger utility
 * Logs are only shown in development and test environments
 * Critical errors are always logged
 */

const isDevelopment = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test';
const shouldLog = isDevelopment || isTest;

export const logger = {
  /**
   * Log general information (development/test only)
   */
  log: (...args: any[]): void => {
    if (shouldLog) {
      console.log(...args);
    }
  },

  /**
   * Log errors (development/test only)
   */
  error: (...args: any[]): void => {
    if (shouldLog) {
      console.error(...args);
    }
  },

  /**
   * Log warnings (development/test only)
   */
  warn: (...args: any[]): void => {
    if (shouldLog) {
      console.warn(...args);
    }
  },

  /**
   * Log informational messages (development/test only)
   */
  info: (...args: any[]): void => {
    if (shouldLog) {
      console.info(...args);
    }
  },

  /**
   * Log debug messages (development/test only)
   */
  debug: (...args: any[]): void => {
    if (shouldLog) {
      console.debug(...args);
    }
  },

  /**
   * Log critical errors (ALWAYS logged, even in production)
   * Use sparingly for system-critical failures only
   */
  critical: (...args: any[]): void => {
    console.error('[CRITICAL]', ...args);
  },
};

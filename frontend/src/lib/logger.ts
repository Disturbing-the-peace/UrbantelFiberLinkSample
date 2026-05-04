/**
 * Environment-aware logger utility for frontend
 * Logs are only shown in development environment
 * Production builds will have all logs stripped
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Log general information (development only)
   */
  log: (...args: any[]): void => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Log errors (development only)
   */
  error: (...args: any[]): void => {
    if (isDevelopment) {
      console.error(...args);
    }
  },

  /**
   * Log warnings (development only)
   */
  warn: (...args: any[]): void => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Log informational messages (development only)
   */
  info: (...args: any[]): void => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  /**
   * Log debug messages (development only)
   */
  debug: (...args: any[]): void => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
};

/**
 * Debug Logger Utility
 * 
 * Provides logging functions that are automatically disabled in production.
 * Use this instead of console.log for debug/diagnostic output.
 * 
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   logger.debug('[COMPONENT] message', data);  // Only in dev
 *   logger.error('[COMPONENT] error', error);   // Always shown
 */

const isDev = import.meta.env.DEV;

// Cached bound functions for performance
const noop = () => {};

export const logger = {
  /**
   * Debug logging - only in development
   * Use for verbose diagnostic output
   */
  debug: isDev ? console.log.bind(console) : noop,
  
  /**
   * Info logging - only in development
   * Use for general information
   */
  info: isDev ? console.info.bind(console) : noop,
  
  /**
   * Warning logging - always shown
   * Use for potential issues that don't break functionality
   */
  warn: console.warn.bind(console),
  
  /**
   * Error logging - always shown
   * Use for actual errors that need attention
   */
  error: console.error.bind(console),
  
  /**
   * Group logging - only in development
   * Use for grouping related logs
   */
  group: isDev ? console.group.bind(console) : noop,
  groupEnd: isDev ? console.groupEnd.bind(console) : noop,
  
  /**
   * Table logging - only in development
   * Use for displaying data in table format
   */
  table: isDev ? console.table.bind(console) : noop,
  
  /**
   * Timing - only in development
   * Use for performance measurements
   */
  time: isDev ? console.time.bind(console) : noop,
  timeEnd: isDev ? console.timeEnd.bind(console) : noop,
};

/**
 * Conditional log that only runs in dev
 * Useful for inline logging without assignments
 */
export function devLog(message: string, ...args: any[]): void {
  if (isDev) {
    console.log(message, ...args);
  }
}

/**
 * Create a namespaced logger for a specific component/module
 * All logs will be prefixed with the namespace
 */
export function createLogger(namespace: string) {
  const prefix = `[${namespace}]`;
  
  return {
    debug: isDev ? (...args: any[]) => console.log(prefix, ...args) : noop,
    info: isDev ? (...args: any[]) => console.info(prefix, ...args) : noop,
    warn: (...args: any[]) => console.warn(prefix, ...args),
    error: (...args: any[]) => console.error(prefix, ...args),
  };
}


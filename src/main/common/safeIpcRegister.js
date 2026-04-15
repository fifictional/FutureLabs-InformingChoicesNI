import { ipcMain } from 'electron';
import { logger } from './logger.js';

/**
 * Register an async IPC handler with automatic error handling
 * Ensures errors don't crash the app and are logged
 */
export function registerSafeAsyncHandler(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      const result = await handler(...args);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`IPC handler failed: ${channel}`, error);
      return {
        ok: false,
        error: errorMessage || 'An unexpected error occurred'
      };
    }
  });
}

/**
 * Register a sync IPC handler with automatic error handling
 */
export function registerSafeSyncHandler(channel, handler) {
  ipcMain.handle(channel, (event, ...args) => {
    try {
      const result = handler(...args);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`IPC handler failed: ${channel}`, error);
      return {
        ok: false,
        error: errorMessage || 'An unexpected error occurred'
      };
    }
  });
}

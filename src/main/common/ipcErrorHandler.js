import { logger } from './logger.js';

/**
 * Safely execute an async IPC handler and catch errors
 * Returns { ok: false, error: "message" } on error instead of crashing
 */
export async function safeIpcHandler(handlerName, handlerFn) {
  try {
    const result = await handlerFn();
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`IPC handler failed: ${handlerName}`, error);
    return {
      ok: false,
      error: errorMessage || 'An unexpected error occurred'
    };
  }
}

/**
 * Sync version for non-async handlers
 */
export function safeIpcHandlerSync(handlerName, handlerFn) {
  try {
    return handlerFn();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`IPC handler failed: ${handlerName}`, error);
    return {
      ok: false,
      error: errorMessage || 'An unexpected error occurred'
    };
  }
}

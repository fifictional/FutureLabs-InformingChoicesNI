import path from 'path';
import fs from 'fs';
import { app } from 'electron';

const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB

function getLogDir() {
  try {
    if (app?.isReady?.()) {
      return path.join(app.getPath('userData'), 'logs');
    }
  } catch {
    // Ignore and fall back to process cwd.
  }
  return path.join(process.cwd(), 'logs');
}

function getLogFile() {
  return path.join(getLogDir(), 'app.log');
}

// Ensure log directory exists
function ensureLogDir() {
  const logDir = getLogDir();
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

function rotateLogIfNeeded() {
  const logDir = getLogDir();
  const logFile = getLogFile();
  if (fs.existsSync(logFile)) {
    const stats = fs.statSync(logFile);
    if (stats.size > MAX_LOG_SIZE) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archivePath = path.join(logDir, `app-${timestamp}.log`);
      fs.renameSync(logFile, archivePath);
      // Clean up old archives (keep last 5)
      const files = fs
        .readdirSync(logDir)
        .filter((f) => f.startsWith('app-') && f.endsWith('.log'))
        .sort()
        .reverse();
      if (files.length > 5) {
        files.slice(5).forEach((f) => fs.unlinkSync(path.join(logDir, f)));
      }
    }
  }
}

function formatLogMessage(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const dataStr = data ? ' ' + JSON.stringify(data) : '';
  return `[${timestamp}] [${level}] ${message}${dataStr}\n`;
}

function writeLog(level, message, data = null) {
  try {
    ensureLogDir();
    rotateLogIfNeeded();
    const logFile = getLogFile();
    const logMessage = formatLogMessage(level, message, data);
    fs.appendFileSync(logFile, logMessage, 'utf-8');
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

export const logger = {
  info: (message, data) => {
    console.log(`[INFO] ${message}`, data || '');
    writeLog('INFO', message, data);
  },
  warn: (message, data) => {
    console.warn(`[WARN] ${message}`, data || '');
    writeLog('WARN', message, data);
  },
  error: (message, error) => {
    const errorData =
      error instanceof Error ? { message: error.message, stack: error.stack } : error;
    console.error(`[ERROR] ${message}`, errorData || '');
    writeLog('ERROR', message, errorData);
  },
  debug: (message, data) => {
    if (process.env.DEBUG) {
      console.log(`[DEBUG] ${message}`, data || '');
      writeLog('DEBUG', message, data);
    }
  }
};

export function getLogFilePath() {
  return getLogFile();
}

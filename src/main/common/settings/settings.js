import path from 'path';
import { app } from 'electron';
import fs from 'fs';
import { logger } from '../logger.js';

function getSettingsPath() {
  try {
    if (app?.isReady?.()) {
      return path.join(app.getPath('userData'), 'settings.json');
    }
  } catch {
    // Ignore and fall back to process cwd.
  }
  return path.join(process.cwd(), 'settings.json');
}

export const SETTINGS_KEYS = {
  GOOGLE_CREDENTIAL_SOURCE_PATH: 'googleCredentialSourcePath',
  GOOGLE_RAW_CREDENTIALS_RELATIVE_PATH: 'googleCredentialsPath',
  GOOGLE_ENCRYPTED_CREDENTIALS_RELATIVE_PATH: 'googleEncryptedCredentialsPath',
  GOOGLE_ENCRYPTED_TOKEN_RELATIVE_PATH: 'googleEncryptedTokenPath',
  MYSQL_HOST: 'mysqlHost',
  MYSQL_PORT: 'mysqlPort',
  MYSQL_DATABASE: 'mysqlDatabase',
  MYSQL_USER: 'mysqlUser'
};

export const DEFAULT_SETTINGS = {
  [SETTINGS_KEYS.GOOGLE_CREDENTIAL_SOURCE_PATH]: '',
  [SETTINGS_KEYS.GOOGLE_RAW_CREDENTIALS_RELATIVE_PATH]: '',
  [SETTINGS_KEYS.GOOGLE_ENCRYPTED_CREDENTIALS_RELATIVE_PATH]:
    'credentials/encrypted-credentials.bin',
  [SETTINGS_KEYS.GOOGLE_ENCRYPTED_TOKEN_RELATIVE_PATH]: 'credentials/encrypted-token.bin',
  [SETTINGS_KEYS.MYSQL_HOST]: '',
  [SETTINGS_KEYS.MYSQL_PORT]: '',
  [SETTINGS_KEYS.MYSQL_DATABASE]: '',
  [SETTINGS_KEYS.MYSQL_USER]: ''
};

function loadSettings() {
  const settingsPath = getSettingsPath();
  if (!fs.existsSync(settingsPath)) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const data = fs.readFileSync(settingsPath, 'utf-8');
    const parsed = JSON.parse(data);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (err) {
    logger.error('Failed to load settings, using defaults', err);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Atomically write settings to file using temp file + rename
 * This prevents corruption if process crashes during write
 */
function saveSettings(settings) {
  const settingsPath = getSettingsPath();
  try {
    const dir = path.dirname(settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write to temporary file first
    const tempPath = `${settingsPath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(settings, null, 2), 'utf-8');

    // Atomic rename on most file systems
    fs.renameSync(tempPath, settingsPath);
    logger.info('Settings saved successfully');
  } catch (err) {
    logger.error('Failed to save settings', err);
    throw new Error(`Failed to save settings: ${err.message}`);
  }
}

export function setSetting(key, value) {
  const settings = loadSettings();
  settings[key] = value;
  saveSettings(settings);
}

export function getSetting(key) {
  const settings = loadSettings();
  return settings[key] ?? null;
}

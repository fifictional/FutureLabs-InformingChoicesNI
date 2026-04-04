import path from 'path';
import { app } from 'electron';
import fs from 'fs';

const settingsPath = path.join(app.getPath('userData'), 'settings.json');

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
  if (!fs.existsSync(settingsPath)) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const data = fs.readFileSync(settingsPath, 'utf-8');
    const parsed = JSON.parse(data);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
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

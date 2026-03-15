import path from 'path';
import { app } from 'electron';
import fs from 'fs';

const settingsPath = path.join(app.getPath('userData'), 'settings.json');

export const SETTINGS_KEYS = {
  GOOGLE_RAW_CREDENTIALS_RELATIVE_PATH: 'googleCredentialsPath',
  GOOGLE_ENCRYPTED_CREDENTIALS_RELATIVE_PATH: 'googleEncryptedCredentialsPath',
  GOOGLE_ENCRYPTED_FORMS_TOKEN_RELATIVE_PATH: 'googleEncryptedFormsTokenPath',
  GOOGLE_ENCRYPTED_DRIVE_TOKEN_RELATIVE_PATH: 'googleEncryptedDriveTokenPath'
};

export const DEFAULT_SETTINGS = {
  [SETTINGS_KEYS.GOOGLE_RAW_CREDENTIALS_RELATIVE_PATH]: 'credentials/credentials.json',
  [SETTINGS_KEYS.GOOGLE_ENCRYPTED_CREDENTIALS_RELATIVE_PATH]:
    'credentials/encrypted-credentials.bin',
  [SETTINGS_KEYS.GOOGLE_ENCRYPTED_FORMS_TOKEN_RELATIVE_PATH]:
    'credentials/encrypted-forms-token.bin',
  [SETTINGS_KEYS.GOOGLE_ENCRYPTED_DRIVE_TOKEN_RELATIVE_PATH]:
    'credentials/encrypted-drive-token.bin'
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

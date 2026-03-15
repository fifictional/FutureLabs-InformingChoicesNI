import { app, safeStorage } from 'electron';
import { getSetting, SETTINGS_KEYS } from '../settings/settings';
import path from 'path';
import fs from 'fs';

function migrateRawCredentialsToEncryptedStore() {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption is not available on this system');
  }

  let credentialRelativePath = getSetting(SETTINGS_KEYS.GOOGLE_RAW_CREDENTIALS_RELATIVE_PATH);
  if (!credentialRelativePath) {
    throw new Error('Google credentials path is not set');
  }

  let credentialStorePath = path.join(app.getPath('userData'), credentialRelativePath);
  if (!fs.existsSync(credentialStorePath)) {
    throw new Error('Google credentials file does not exist');
  }

  const rawData = fs.readFileSync(credentialStorePath, 'utf-8');
  const encryptedData = safeStorage.encryptString(rawData);
  let encryptedRelativePath = getSetting(SETTINGS_KEYS.GOOGLE_ENCRYPTED_CREDENTIALS_RELATIVE_PATH);
  if (!encryptedRelativePath) {
    throw new Error('Google encrypted credentials path is not set');
  }

  let encryptedStorePath = path.join(app.getPath('userData'), encryptedRelativePath);
  fs.mkdirSync(path.dirname(encryptedStorePath), { recursive: true });
  fs.writeFileSync(encryptedStorePath, encryptedData);
  fs.unlinkSync(credentialStorePath);
  return JSON.parse(rawData);
}

export function getCredentials() {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption is not available on this system');
  }

  let encryptedRelativePath = getSetting(SETTINGS_KEYS.GOOGLE_ENCRYPTED_CREDENTIALS_RELATIVE_PATH);
  if (!encryptedRelativePath) {
    throw new Error('Google encrypted credentials path is not set');
  }

  let encryptedStorePath = path.join(app.getPath('userData'), encryptedRelativePath);
  if (fs.existsSync(encryptedStorePath)) {
    const encryptedData = fs.readFileSync(encryptedStorePath);
    return JSON.parse(safeStorage.decryptString(encryptedData));
  }

  try {
    return migrateRawCredentialsToEncryptedStore();
  } catch (error) {
    throw new Error(`Failed to encrypt raw credentials: ${error.message}`);
  }
}

import { app, safeStorage } from 'electron';
import { getSetting, SETTINGS_KEYS } from '../settings/settings';
import path from 'path';
import fs from 'fs';

function getCredentialPaths() {
  const credentialRelativePath = getSetting(SETTINGS_KEYS.GOOGLE_RAW_CREDENTIALS_RELATIVE_PATH);
  if (!credentialRelativePath) {
    throw new Error('Google credentials path is not set');
  }

  const encryptedRelativePath = getSetting(
    SETTINGS_KEYS.GOOGLE_ENCRYPTED_CREDENTIALS_RELATIVE_PATH
  );
  if (!encryptedRelativePath) {
    throw new Error('Google encrypted credentials path is not set');
  }

  return {
    raw: path.join(app.getPath('userData'), credentialRelativePath),
    encrypted: path.join(app.getPath('userData'), encryptedRelativePath)
  };
}

export function hasCredentialFiles() {
  const { raw, encrypted } = getCredentialPaths();
  return fs.existsSync(encrypted) || fs.existsSync(raw);
}

function migrateRawCredentialsToEncryptedStore() {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption is not available on this system');
  }

  const { raw: credentialStorePath, encrypted: encryptedStorePath } = getCredentialPaths();
  if (!fs.existsSync(credentialStorePath)) {
    throw new Error('Google credentials file does not exist');
  }

  const rawData = fs.readFileSync(credentialStorePath, 'utf-8');
  const encryptedData = safeStorage.encryptString(rawData);
  fs.mkdirSync(path.dirname(encryptedStorePath), { recursive: true });
  fs.writeFileSync(encryptedStorePath, encryptedData);
  fs.unlinkSync(credentialStorePath);
  return JSON.parse(rawData);
}

export function getCredentials() {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption is not available on this system');
  }

  const { encrypted: encryptedStorePath } = getCredentialPaths();
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

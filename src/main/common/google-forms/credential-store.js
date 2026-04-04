import { app, safeStorage } from 'electron';
import { getSetting, SETTINGS_KEYS } from '../settings/settings';
import path from 'path';
import fs from 'fs';

function resolveCredentialPath(value) {
  if (!value) {
    return null;
  }

  if (path.isAbsolute(value)) {
    const root = path.parse(value).root;
    const relative = path.relative(root, value);
    return path.join(app.getPath('userData'), relative);
  }

  return path.join(app.getPath('userData'), value);
}

function isValidCredentialObject(candidate) {
  const config = candidate?.installed || candidate?.web;
  return Boolean(config?.client_id && config?.client_secret);
}

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
    raw: resolveCredentialPath(credentialRelativePath),
    encrypted: resolveCredentialPath(encryptedRelativePath)
  };
}

export function hasCredentialFiles() {
  try {
    const { raw, encrypted } = getCredentialPaths();
    return fs.existsSync(encrypted) || fs.existsSync(raw);
  } catch {
    return false;
  }
}

export function getCredentialStatus() {
  let paths;
  try {
    paths = getCredentialPaths();
  } catch (error) {
    return {
      configured: false,
      hasRawFile: false,
      hasEncryptedFile: false,
      valid: false,
      message: error?.message || 'Google credentials path is not configured.'
    };
  }

  const hasRawFile = fs.existsSync(paths.raw);
  const hasEncryptedFile = fs.existsSync(paths.encrypted);

  if (!hasRawFile && !hasEncryptedFile) {
    return {
      configured: true,
      hasRawFile,
      hasEncryptedFile,
      valid: false,
      message: 'No Google credentials file has been processed yet.'
    };
  }

  if (hasEncryptedFile) {
    if (!safeStorage.isEncryptionAvailable()) {
      return {
        configured: true,
        hasRawFile,
        hasEncryptedFile,
        valid: false,
        message: 'Encryption is not available on this system.'
      };
    }

    try {
      const encryptedData = fs.readFileSync(paths.encrypted);
      const decrypted = safeStorage.decryptString(encryptedData);
      const parsed = JSON.parse(decrypted);
      if (!isValidCredentialObject(parsed)) {
        return {
          configured: true,
          hasRawFile,
          hasEncryptedFile,
          valid: false,
          message: 'Stored Google credentials are invalid.'
        };
      }

      return {
        configured: true,
        hasRawFile,
        hasEncryptedFile,
        valid: true,
        message: 'Google credentials are configured.'
      };
    } catch (error) {
      return {
        configured: true,
        hasRawFile,
        hasEncryptedFile,
        valid: false,
        message: error?.message || 'Failed to read stored Google credentials.'
      };
    }
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(paths.raw, 'utf-8'));
    if (!isValidCredentialObject(parsed)) {
      return {
        configured: true,
        hasRawFile,
        hasEncryptedFile,
        valid: false,
        message: 'Google credentials file is invalid.'
      };
    }

    return {
      configured: true,
      hasRawFile,
      hasEncryptedFile,
      valid: true,
      message: 'Google credentials file is present and valid.'
    };
  } catch (error) {
    return {
      configured: true,
      hasRawFile,
      hasEncryptedFile,
      valid: false,
      message: error?.message || 'Failed to parse Google credentials file.'
    };
  }
}

export function processCredentialsFile(sourceFilePath) {
  if (!sourceFilePath) {
    throw new Error('No credentials file selected');
  }
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption is not available on this system');
  }
  if (!fs.existsSync(sourceFilePath)) {
    throw new Error('Selected credentials file does not exist');
  }

  const rawData = fs.readFileSync(sourceFilePath, 'utf-8');
  let parsed;
  try {
    parsed = JSON.parse(rawData);
  } catch {
    throw new Error('Credentials file is not valid JSON');
  }

  if (!isValidCredentialObject(parsed)) {
    throw new Error('Credentials JSON must include installed/web client_id and client_secret');
  }

  const { encrypted } = getCredentialPaths();
  fs.mkdirSync(path.dirname(encrypted), { recursive: true });
  const encryptedData = safeStorage.encryptString(JSON.stringify(parsed));
  fs.writeFileSync(encrypted, encryptedData);

  return {
    ok: true,
    message: 'Credentials file processed successfully.',
    encryptedPath: encrypted
  };
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

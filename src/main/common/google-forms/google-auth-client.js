import { getSetting, SETTINGS_KEYS } from '../settings/settings';
import {
  createOAuthClient,
  getAppUserDataPath,
  readEncryptedToken,
  runInteractiveOAuthFlow,
  saveEncryptedToken
} from './google-oauth-common';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/forms.body.readonly',
  'https://www.googleapis.com/auth/forms.responses.readonly'
];

function getTokenFilePath() {
  const tokenRelativePath = getSetting(SETTINGS_KEYS.GOOGLE_ENCRYPTED_TOKEN_RELATIVE_PATH);
  if (!tokenRelativePath) {
    throw new Error('Google encrypted forms token path is not set');
  }

  return getAppUserDataPath(tokenRelativePath);
}

function saveGoogleToken(tokenObject) {
  saveEncryptedToken(getTokenFilePath(), tokenObject);
}

function readSavedGoogleToken() {
  return readEncryptedToken(getTokenFilePath());
}

async function getNewTokenInteractive() {
  return runInteractiveOAuthFlow({
    scopes: SCOPES,
    onTokens: saveGoogleToken,
    successMessage: 'Google Forms authorization successful. You can close this window.'
  });
}

export async function getGoogleAuthClient() {
  const savedToken = readSavedGoogleToken();
  if (savedToken) {
    const client = createOAuthClient();
    client.setCredentials(savedToken);
    return client;
  }

  return getNewTokenInteractive();
}

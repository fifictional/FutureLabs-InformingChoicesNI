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

function getFormsTokenFilePath() {
  const tokenRelativePath = getSetting(SETTINGS_KEYS.GOOGLE_ENCRYPTED_FORMS_TOKEN_RELATIVE_PATH);
  if (!tokenRelativePath) {
    throw new Error('Google encrypted forms token path is not set');
  }

  return getAppUserDataPath(tokenRelativePath);
}

function saveGoogleFormsToken(tokenObject) {
  saveEncryptedToken(getFormsTokenFilePath(), tokenObject);
}

function readSavedGoogleFormsToken() {
  return readEncryptedToken(getFormsTokenFilePath());
}

async function getNewFormsTokenInteractive() {
  return runInteractiveOAuthFlow({
    scopes: SCOPES,
    onTokens: saveGoogleFormsToken,
    successMessage: 'Google Forms authorization successful. You can close this window.'
  });
}

export async function getGoogleFormsClient() {
  const savedToken = readSavedGoogleFormsToken();

  if (savedToken) {
    const client = createOAuthClient();
    client.setCredentials(savedToken);
    return client;
  }

  return getNewFormsTokenInteractive();
}

import { getSetting, SETTINGS_KEYS } from '../settings/settings';
import {
  createOAuthClient,
  deleteEncryptedToken,
  getAppUserDataPath,
  readEncryptedToken,
  runInteractiveOAuthFlow,
  saveEncryptedToken,
  cancelOAuthFlow
} from './google-oauth-common';
import { hasCredentialFiles } from './credential-store';
import { fetchWithTimeout } from '../fetchTimeout.js';
import { logger } from '../logger.js';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/forms.responses.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid'
];

function throwMissingCredentialsError() {
  const error = new Error(
    'No Google credentials were found. Please add credentials/credentials.json in the app data folder before signing in.'
  );
  error.code = 'GOOGLE_CREDENTIALS_MISSING';
  throw error;
}

function assertCredentialsAvailable() {
  if (!hasCredentialFiles()) {
    throwMissingCredentialsError();
  }
}

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

function clearSavedGoogleToken() {
  deleteEncryptedToken(getTokenFilePath());
}

async function getNewTokenInteractive() {
  return runInteractiveOAuthFlow({
    scopes: SCOPES,
    onTokens: saveGoogleToken,
    successMessage: 'Google Forms authorization successful. You can close this window.'
  });
}

export async function getGoogleAuthClient() {
  assertCredentialsAvailable();

  const savedToken = readSavedGoogleToken();
  if (savedToken) {
    const client = createOAuthClient();
    client.setCredentials(savedToken);
    return client;
  }

  return getNewTokenInteractive();
}

export async function isUserAuthenticated() {
  assertCredentialsAvailable();

  const savedToken = readSavedGoogleToken();
  if (savedToken) {
    const client = createOAuthClient();
    client.setCredentials(savedToken);
    try {
      await client.getAccessToken();
      return true;
    } catch (error) {
      console.warn('Saved Google token is invalid or expired:', error);
    }
  }

  return false;
}

export async function ensureAuthenticated() {
  try {
    assertCredentialsAvailable();

    const authenticated = await isUserAuthenticated();
    if (authenticated) {
      return true;
    }

    await getNewTokenInteractive();
    return true;
  } catch (error) {
    console.warn('Google authentication failed:', error);
    return false;
  }
}

export async function signOut() {
  clearSavedGoogleToken();
  return true;
}

export { cancelOAuthFlow };

async function fetchUserProfilePictureBase64(pictureUrl) {
  const response = await fetchWithTimeout(pictureUrl, {}, 10000);
  if (!response.ok) {
    throw new Error(`Failed to fetch user profile picture: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const mimeType = response.headers.get('content-type') || 'image/png';
  return `data:${mimeType};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
}

export async function getUserProfile() {
  const token = readSavedGoogleToken();
  if (!token) {
    return null;
  }

  const client = createOAuthClient();
  client.setCredentials(token);

  try {
    const response = await client.request({
      url: 'https://www.googleapis.com/oauth2/v3/userinfo'
    });

    const userInfo = response.data;

    if (userInfo.picture) {
      try {
        userInfo.pictureBase64 = await fetchUserProfilePictureBase64(userInfo.picture);
      } catch (err) {
        logger.warn('Failed to fetch user profile picture', err);
        // Continue without picture
      }
    }

    return userInfo;
  } catch (err) {
    logger.error('Failed to fetch user profile', err);
    throw err;
  }
}

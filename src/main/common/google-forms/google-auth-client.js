import { getSetting, SETTINGS_KEYS } from '../settings/settings';
import {
  createOAuthClient,
  getAppUserDataPath,
  readEncryptedToken,
  runInteractiveOAuthFlow,
  saveEncryptedToken
} from './google-oauth-common';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/forms.responses.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid'
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

export async function isUserAuthenticated() {
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
    const authenticated = await isUserAuthenticated();
    if (authenticated) {
      return true;
    } else {
      await getNewTokenInteractive();
      return true;
    }
  } catch (error) {
    return error;
  }
}

async function fetchUserProfilePictureBase64(pictureUrl) {
  const response = await fetch(pictureUrl);
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
    throw new Error('No Google token found');
  }

  const client = createOAuthClient();
  client.setCredentials(token);
  const response = await client.request({
    url: 'https://www.googleapis.com/oauth2/v3/userinfo'
  });

  const userInfo = response.data;

  if (userInfo.picture) {
    userInfo.pictureBase64 = await fetchUserProfilePictureBase64(userInfo.picture);
  }

  return userInfo;
}

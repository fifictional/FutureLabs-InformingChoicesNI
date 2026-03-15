import { app, safeStorage, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { URL } from 'url';
import { OAuth2Client } from 'google-auth-library';
import { getCredentials } from './credential-store';
import { getSetting, SETTINGS_KEYS } from '../settings/settings';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

function getTokenFilePath() {
  const tokenRelativePath = getSetting(SETTINGS_KEYS.GOOGLE_ENCRYPTED_TOKEN_RELATIVE_PATH);
  if (!tokenRelativePath) {
    throw new Error('Google encrypted token path is not set');
  }

  return path.join(app.getPath('userData'), tokenRelativePath);
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function saveGoogleToken(tokenObject) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption is not available on this system');
  }

  const tokenFile = getTokenFilePath();
  ensureParentDir(tokenFile);

  const json = JSON.stringify(tokenObject);
  const encrypted = safeStorage.encryptString(json);
  fs.writeFileSync(tokenFile, encrypted);
}

function readSavedGoogleToken() {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption is not available on this system');
  }

  const tokenFile = getTokenFilePath();
  if (!fs.existsSync(tokenFile)) {
    return null;
  }

  const encrypted = fs.readFileSync(tokenFile);
  const json = safeStorage.decryptString(encrypted);
  return JSON.parse(json);
}

function createOAuthClient() {
  const credentials = getCredentials();
  const config = credentials.installed || credentials.web;

  if (!config?.client_id || !config?.client_secret) {
    throw new Error('Invalid Google credentials format');
  }

  return new OAuth2Client({
    clientId: config.client_id,
    clientSecret: config.client_secret,
    redirectUri: config.redirect_uris?.[0] || 'http://localhost'
  });
}

async function getNewTokenInteractive() {
  const credentials = getCredentials();
  const config = credentials.installed || credentials.web;
  const redirectUri = config.redirect_uris?.[0] || 'http://localhost';
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        if (!req.url) {
          res.statusCode = 400;
          res.end('Missing request URL');
          return;
        }

        const requestUrl = new URL(req.url, redirectUri);
        const code = requestUrl.searchParams.get('code');
        const error = requestUrl.searchParams.get('error');

        if (error) {
          res.statusCode = 400;
          res.end(`Google OAuth error: ${error}`);
          server.close();
          reject(new Error(`Google OAuth error: ${error}`));
          return;
        }

        if (!code) {
          res.statusCode = 400;
          res.end('Missing authorization code');
          return;
        }

        const client = createOAuthClient();

        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);

        saveGoogleToken(tokens);

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Google authorization successful. You can close this window.');

        server.close();
        resolve(client);
      } catch (error) {
        try {
          res.statusCode = 500;
          res.end('Authorization failed');
        } catch {
          // Ignore errors while sending response
        }
        server.close();
        reject(error);
      }
    });

    server.on('error', reject);

    const parsed = new URL(redirectUri);
    const hostname = parsed.hostname;
    const port = parsed.port ? Number(parsed.port) : 80;
    server.listen(port, hostname, async () => {
      try {
        const client = createOAuthClient();

        const authUrl = client.generateAuthUrl({
          access_type: 'offline',
          scope: SCOPES,
          prompt: 'consent'
        });

        await shell.openExternal(authUrl);
      } catch (error) {
        server.close();
        reject(error);
      }
    });
  });
}

export async function getGoogleClient() {
  const savedToken = readSavedGoogleToken();

  if (savedToken) {
    const client = createOAuthClient();
    client.setCredentials(savedToken);
    return client;
  }

  return getNewTokenInteractive();
}

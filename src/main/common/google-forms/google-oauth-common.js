import { app, safeStorage, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { URL } from 'url';
import { OAuth2Client } from 'google-auth-library';
import { getCredentials } from './credential-store';

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function saveEncryptedToken(tokenFilePath, tokenObject) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption is not available on this system');
  }

  ensureParentDir(tokenFilePath);

  const json = JSON.stringify(tokenObject);
  const encrypted = safeStorage.encryptString(json);
  fs.writeFileSync(tokenFilePath, encrypted);
}

export function readEncryptedToken(tokenFilePath) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption is not available on this system');
  }

  if (!fs.existsSync(tokenFilePath)) {
    return null;
  }

  const encrypted = fs.readFileSync(tokenFilePath);
  const json = safeStorage.decryptString(encrypted);
  return JSON.parse(json);
}

export function getAppUserDataPath(...segments) {
  return path.join(app.getPath('userData'), ...segments);
}

export function createOAuthClient() {
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

export function getOAuthRedirectUri() {
  const credentials = getCredentials();
  const config = credentials.installed || credentials.web;
  return config.redirect_uris?.[0] || 'http://localhost';
}

export async function runInteractiveOAuthFlow({
  scopes,
  onTokens,
  successMessage = 'Google authorization successful. You can close this window.',
  buildAuthUrl,
  onCallback
}) {
  const redirectUri = getOAuthRedirectUri();

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

        if (onTokens) {
          await onTokens(tokens, requestUrl);
        }

        const result = onCallback ? await onCallback({ client, tokens, requestUrl }) : client;

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(successMessage);

        server.close();
        resolve(result);
      } catch (error) {
        try {
          res.statusCode = 500;
          res.end('Authorization failed');
        } catch {
          // Ignore response write errors
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

        const defaultAuthUrl = client.generateAuthUrl({
          access_type: 'offline',
          scope: scopes,
          prompt: 'consent'
        });

        const authUrl = buildAuthUrl
          ? await buildAuthUrl({ client, authUrl: defaultAuthUrl })
          : defaultAuthUrl;

        await shell.openExternal(authUrl);
      } catch (error) {
        server.close();
        reject(error);
      }
    });
  });
}

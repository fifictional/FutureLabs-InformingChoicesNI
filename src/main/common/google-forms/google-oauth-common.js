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

export function deleteEncryptedToken(tokenFilePath) {
  if (fs.existsSync(tokenFilePath)) {
    fs.unlinkSync(tokenFilePath);
  }
}

export function getAppUserDataPath(...segments) {
  return path.join(app.getPath('userData'), ...segments);
}

export function createOAuthClient(redirectUriOverride) {
  const credentials = getCredentials();
  const config = credentials.installed || credentials.web;

  if (!config?.client_id || !config?.client_secret) {
    throw new Error('Invalid Google credentials format');
  }

  return new OAuth2Client({
    clientId: config.client_id,
    clientSecret: config.client_secret,
    redirectUri: redirectUriOverride || config.redirect_uris?.[0] || 'http://localhost'
  });
}

export function getOAuthRedirectUri() {
  const credentials = getCredentials();
  const config = credentials.installed || credentials.web;
  return config.redirect_uris?.[0] || 'http://localhost';
}

let _activeOAuthServer = null;
let _activeOAuthReject = null;

function closeActiveOAuthServer() {
  if (_activeOAuthServer) {
    try {
      _activeOAuthServer.close();
    } catch {
      /* ignore */
    }
    _activeOAuthServer = null;
  }
}

export function cancelOAuthFlow() {
  closeActiveOAuthServer();
  if (_activeOAuthReject) {
    _activeOAuthReject(new Error('Google sign-in was cancelled by the user'));
    _activeOAuthReject = null;
  }
}

export async function runInteractiveOAuthFlow({
  scopes,
  onTokens,
  successMessage = 'Google authorisation successful. You can close this window.',
  buildAuthUrl,
  onCallback
}) {
  closeActiveOAuthServer();

  const redirectUri = getOAuthRedirectUri();
  const parsed = new URL(redirectUri);
  const hostname = parsed.hostname || '127.0.0.1';
  const port = parsed.port ? Number(parsed.port) : 3000;
  const runtimeRedirectUri = `${parsed.protocol}//${hostname}:${port}${parsed.pathname || ''}`;

  return new Promise((resolve, reject) => {
    _activeOAuthReject = reject;
    let settled = false;
    let timeoutId = null;

    function settle(fn) {
      if (settled) return;
      settled = true;
      _activeOAuthReject = null;
      clearTimeout(timeoutId);
      try {
        server.close();
      } catch {
        /* ignore */
      }
      fn();
    }

    const server = http.createServer(async (req, res) => {
      try {
        if (!req.url) {
          res.statusCode = 400;
          res.end('Missing request URL');
          return;
        }

        const requestUrl = new URL(req.url, runtimeRedirectUri);
        const code = requestUrl.searchParams.get('code');
        const error = requestUrl.searchParams.get('error');

        if (error) {
          res.statusCode = 400;
          res.end(`Google OAuth error: ${error}`);
          settle(() => reject(new Error(`Google OAuth error: ${error}`)));
          return;
        }

        if (!code) {
          res.statusCode = 400;
          res.end('Missing authorisation code');
          return;
        }

        const client = createOAuthClient(runtimeRedirectUri);
        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);

        if (onTokens) {
          await onTokens(tokens, requestUrl);
        }

        const result = onCallback ? await onCallback({ client, tokens, requestUrl }) : client;

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(successMessage);

        settle(() => resolve(result));
      } catch (error) {
        try {
          res.statusCode = 500;
          res.end('Authorisation failed');
        } catch {
          // Ignore response write errors
        }
        settle(() => reject(error));
      }
    });

    _activeOAuthServer = server;

    server.on('close', () => {
      if (_activeOAuthServer === server) _activeOAuthServer = null;
    });

    server.on('error', (err) => {
      if (_activeOAuthServer === server) _activeOAuthServer = null;
      reject(err);
    });

    server.listen(port, hostname, async () => {
      try {
        timeoutId = setTimeout(
          () => {
            settle(() => reject(new Error('Google sign-in timed out. Please try again.')));
          },
          5 * 60 * 1000
        );

        const client = createOAuthClient(runtimeRedirectUri);

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
        settle(() => reject(error));
      }
    });
  });
}

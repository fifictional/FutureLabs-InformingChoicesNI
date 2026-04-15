# Informing Choices

Desktop application for importing survey data (Google Forms and Excel), organizing events and clients, and running analysis/chart workflows.

## What The App Does

- Imports survey definitions and responses from Google Forms.
- Imports survey response data from Excel workbooks.
- Stores and manages data in MySQL using Drizzle ORM.
- Supports events, tags, clients, and analysis/chart configuration.
- Provides startup readiness checks for database and Google authentication state.

## Tech Stack

- Electron + React + Vite (via electron-vite)
- Material UI
- MySQL + drizzle-orm
- google-auth-library + Google Forms/Drive APIs

## Production Prerequisites

- Node.js 20+ and npm
- MySQL server accessible from client machines
- Google Cloud project for OAuth authentication

## Google Cloud Setup (Required For Google Forms Features)

1. Open Google Cloud Console and create/select a project.
   - Console: https://console.cloud.google.com/
   - API Library: https://console.cloud.google.com/apis/library
2. Enable these APIs in that project:
   - Google Forms API
   - Google Drive API
3. Configure OAuth consent screen:
   - Open: https://console.cloud.google.com/apis/credentials/consent
   - Choose audience:
     - Internal: only users in your Google Workspace organization.
     - External: users outside your org (requires test users while app is in Testing mode).
   - Fill app details.
   - Add scopes under Data Access:
     - https://www.googleapis.com/auth/drive.readonly
     - https://www.googleapis.com/auth/forms.body
     - https://www.googleapis.com/auth/forms.responses.readonly
     - https://www.googleapis.com/auth/userinfo.profile
     - openid
   - If app is in testing mode, add all intended user emails as test users.
4. Create OAuth Client ID with application type Desktop app.
   - Credentials page: https://console.cloud.google.com/apis/credentials
5. Download the credentials JSON file (commonly named credentials.json).
6. In the app Settings page:
   - Click Select credentials.json.
   - Choose that downloaded file.
   - Click Sign In With Google and complete consent flow.

Required OAuth scopes requested by the app:

- https://www.googleapis.com/auth/drive.readonly
- https://www.googleapis.com/auth/forms.body
- https://www.googleapis.com/auth/forms.responses.readonly
- https://www.googleapis.com/auth/userinfo.profile
- openid

Important:

- Use OAuth desktop client credentials JSON.
- Do not use service account credentials for this interactive flow.

## Database Setup

1. Ensure a MySQL server/database exists for the app.
2. Set DB_PASSWORD as an operating system environment variable on each client machine.
3. In app Settings, enter host, port, database name, and username.
4. Click Test Connection.
5. Click Setup Database.
6. Click Migrate Schema.
7. Click Refresh Health and confirm healthy state.

## Install And Run From Source

```bash
npm install
npm run dev
```

## Build From Source

```bash
# Build app bundles only
npm run build

# Build unpacked desktop app (debug packaging output)
npm run build:unpack

# Build Windows installer
npm run build:win

# Build macOS artifacts
npm run build:mac

# Build Linux artifacts
npm run build:linux
```

## Client Distribution (Windows)

For normal client rollout, distribute the generated Windows installer from the dist folder (for example: informing-choices-<version>-setup.exe).

Clients do not need source files, node_modules, or the unpacked output.

## Development Workflow

- Start dev mode: npm run dev
- Lint code: npm run lint
- Format code: npm run format
- Generate Drizzle migration files after schema changes: npm run drizzle:generate

## Security Notes

- Keep OAuth credentials restricted to trusted operators.
- Do not commit secrets or private environment values.
- DB_PASSWORD is intentionally read from environment, not editable in app UI.

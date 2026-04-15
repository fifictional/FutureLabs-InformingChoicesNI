import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../common/AuthContext';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Link,
  Typography
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ContainerWithBackground from '../components/common/ContainerWithBackground';

export default function Settings() {
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const [form, setForm] = useState({ host: '', port: '', database: '', user: '' });
  const [passwordSet, setPasswordSet] = useState(false);
  const [testResult, setTestResult] = useState(null); // null | { ok, error }
  const [setupResult, setSetupResult] = useState(null); // null | { ok, error }
  const [migrateResult, setMigrateResult] = useState(null); // null | { ok, error }
  const [health, setHealth] = useState(null);
  const [googleSettings, setGoogleSettings] = useState(null);
  const [googleAuthState, setGoogleAuthState] = useState(null); // null | { ok, error }
  const [testing, setTesting] = useState(false);
  const [settingUp, setSettingUp] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [processingCredentials, setProcessingCredentials] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [passwordHelpOpen, setPasswordHelpOpen] = useState(false);
  const [passwordHelpPlatform, setPasswordHelpPlatform] = useState('windows');
  const [googleHelpOpen, setGoogleHelpOpen] = useState(false);
  const [googleHelpStep, setGoogleHelpStep] = useState('project');

  useEffect(() => {
    async function loadSettings() {
      try {
        const current = await window.api.dbSettings.get();
        setForm({
          host: current.host || '',
          port: String(current.port || ''),
          database: current.database || '',
          user: current.user || ''
        });
        setPasswordSet(current.passwordSet ?? false);
      } catch (err) {
        console.error('Failed to load DB settings', err);
      }
    }

    async function load() {
      await loadSettings();
      await refreshGoogleSettings();
      await refreshHealth();
    }

    load();
  }, []);

  function buildConfigPayload() {
    return {
      host: form.host,
      port: Number(form.port) || 0,
      database: form.database,
      user: form.user
    };
  }

  async function refreshHealth() {
    setHealthLoading(true);
    try {
      const result = await window.api.dbSettings.getHealth();
      setHealth(result);
    } catch (err) {
      setHealth({
        ok: false,
        connected: false,
        schemaValid: false,
        migrationsValid: false,
        requiredTablesMissing: [],
        expectedMigrations: 0,
        appliedMigrations: 0,
        pendingMigrations: 0,
        message: err.message || 'Failed to inspect database health.'
      });
    } finally {
      setHealthLoading(false);
    }
  }

  async function refreshGoogleSettings() {
    setGoogleLoading(true);
    try {
      const settings = await window.api.googleAuth.getSettings();
      const authenticated = await window.api.googleAuth.isUserAuthenticated().catch(() => false);
      setGoogleSettings({ ...settings, authenticated });
    } catch (err) {
      setGoogleSettings({
        credentialSourcePath: '',
        credentialPath: '',
        encryptedCredentialPath: '',
        tokenPath: '',
        credentialStatus: { valid: false, message: err.message || 'Failed to load Google settings.' },
        authenticated: false
      });
    } finally {
      setGoogleLoading(false);
    }
  }

  function handleChange(field) {
    return (e) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setTestResult(null);
      setSetupResult(null);
      setMigrateResult(null);
    };
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await window.api.dbSettings.testConnection({
        ...buildConfigPayload()
      });
      setTestResult(result);
    } catch (err) {
      setTestResult({ ok: false, error: err.message });
    } finally {
      setTesting(false);
    }
  }

  async function handleSetupDatabase() {
    setSettingUp(true);
    setSetupResult(null);
    setTestResult(null);
    setMigrateResult(null);
    try {
      const result = await window.api.dbSettings.setupDatabase(buildConfigPayload());
      setSetupResult(result);
      await refreshHealth();
    } catch (err) {
      setSetupResult({ ok: false, error: err.message });
    } finally {
      setSettingUp(false);
    }
  }

  async function handleMigrateSchema() {
    setMigrating(true);
    setMigrateResult(null);
    try {
      const result = await window.api.dbSettings.migrateSchema();
      setMigrateResult(result);
      await refreshHealth();
    } catch (err) {
      setMigrateResult({ ok: false, error: err.message });
    } finally {
      setMigrating(false);
    }
  }

  async function handleSelectCredentialFile() {
    setProcessingCredentials(true);
    setGoogleAuthState(null);
    try {
      const selected = await window.api.googleAuth.selectCredentialFile();
      if (!selected?.ok || selected?.cancelled) {
        return;
      }

      const result = await window.api.googleAuth.processCredentialFile(selected.filePath);
      if (!result?.ok) {
        setGoogleAuthState({ ok: false, error: result?.error || 'Failed to process credentials file.' });
      } else {
        setGoogleAuthState({ ok: true, message: result?.message || 'Credentials configured.' });
      }
      await refreshGoogleSettings();
    } catch (err) {
      setGoogleAuthState({ ok: false, error: err.message || 'Failed to process credentials file.' });
    } finally {
      setProcessingCredentials(false);
    }
  }

  async function handleGoogleSignIn() {
    setSigningIn(true);
    setGoogleAuthState(null);
    try {
      const ok = await window.api.googleAuth.ensureAuthenticated();
      if (!ok) {
        setGoogleAuthState({ ok: false, error: 'Google sign-in failed.' });
      } else {
        setGoogleAuthState({ ok: true, message: 'Google sign-in successful.' });
        refreshAuth();
      }
      await refreshGoogleSettings();
    } catch (err) {
      setGoogleAuthState({ ok: false, error: err.message || 'Google sign-in failed.' });
    } finally {
      setSigningIn(false);
    }
  }

  async function handleGoogleSignOut() {
    setSigningOut(true);
    setGoogleAuthState(null);
    try {
      await window.api.googleAuth.signOut();
      setGoogleAuthState({ ok: true, message: 'Signed out from Google.' });
      refreshAuth();
    } catch (err) {
      setGoogleAuthState({ ok: false, error: err.message || 'Failed to sign out from Google.' });
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <ContainerWithBackground>
      <Stack
        spacing={3}
        sx={{
          maxWidth: 1280,
          m: 'auto'
        }}
      >
      <Paper
          elevation={6}
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: 3,
            background: (theme) =>
              `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[50]} 100%)`
          }}
        >
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Google Authentication
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure Google account access for Google Forms features.
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            Use an OAuth 2.0 Desktop App credential JSON from Google Cloud. Service account keys are not
            supported for the interactive sign-in flow used by this app.
          </Alert>

          <Box
            sx={{
              mb: 3,
              p: 2,
              borderRadius: 2,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              bgcolor: 'background.paper'
            }}
          >
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              Google Cloud Setup (Required)
            </Typography>
            <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
              <li>
                <Typography variant="body2">
                  In Google Cloud Console, create or select a project for this app.
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Enable APIs: Google Forms API and Google Drive API.
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Configure OAuth consent screen (Internal or External), set app details, and add test users
                  if your app is still in testing mode.
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Create OAuth Client ID with application type <strong>Desktop app</strong> and download
                  credentials.json.
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  In this page, click <strong>Select credentials.json</strong>, choose the downloaded file,
                  then click <strong>Sign In With Google</strong>.
                </Typography>
              </li>
            </Box>

            <Typography variant="body2" fontWeight={700} sx={{ mt: 1.5, mb: 0.75 }}>
              OAuth scopes requested by the app
            </Typography>
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 1.5,
                borderRadius: 1,
                bgcolor: 'grey.100',
                overflowX: 'auto',
                fontFamily: 'Consolas, monospace',
                fontSize: 13
              }}
            >
              {`https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/forms.body
https://www.googleapis.com/auth/forms.responses.readonly
https://www.googleapis.com/auth/userinfo.profile
openid`}
            </Box>
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            sx={{ mb: 2 }}
          >
            <Typography variant="subtitle1" fontWeight={700}>
              Google Authentication Status
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" onClick={() => setGoogleHelpOpen(true)}>
                How to set up Google Auth
              </Button>
              <Chip
                label={
                  googleLoading
                    ? 'Checking...'
                    : googleSettings?.authenticated
                      ? 'Signed In'
                      : googleSettings?.credentialStatus?.valid
                        ? 'Needs Sign-In'
                        : 'Not Configured'
                }
                color={
                  googleSettings?.authenticated
                    ? 'success'
                    : googleSettings?.credentialStatus?.valid
                      ? 'warning'
                      : 'default'
                }
                size="small"
              />
            </Stack>
          </Stack>

          {googleSettings && (
            <Alert severity={googleSettings.credentialStatus?.valid ? 'success' : 'warning'} sx={{ mb: 2 }}>
              {googleSettings.credentialStatus?.message || 'Google credential status unavailable.'}
            </Alert>
          )}

          {googleSettings?.credentialSourcePath && (
            <TextField
              label="Selected credentials.json file"
              value={googleSettings.credentialSourcePath}
              fullWidth
              sx={{ mb: 2 }}
              slotProps={{ input: { readOnly: true } }}
            />
          )}

          {googleAuthState && (
            <Alert severity={googleAuthState.ok ? 'success' : 'error'} sx={{ mb: 2 }}>
              {googleAuthState.ok
                ? googleAuthState.message
                : `Google auth action failed: ${googleAuthState.error}`}
            </Alert>
          )}

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            justifyContent="flex-end"
            sx={{ flexWrap: 'wrap' }}
          >
            <Button
              variant="outlined"
              onClick={refreshGoogleSettings}
              disabled={googleLoading || processingCredentials || signingIn || signingOut}
            >
              {googleLoading ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
              Refresh Google Status
            </Button>
            <Button
              variant="contained"
              onClick={handleSelectCredentialFile}
              disabled={processingCredentials || signingIn || signingOut}
            >
              {processingCredentials ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
              Select credentials.json
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleGoogleSignIn}
              disabled={
                signingIn ||
                signingOut ||
                processingCredentials ||
                !googleSettings?.credentialStatus?.valid
              }
            >
              {signingIn ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
              Sign In With Google
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={handleGoogleSignOut}
              disabled={signingOut || signingIn}
            >
              {signingOut ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
              Sign Out Google
            </Button>
          </Stack>
        </Paper>

        <Paper
          elevation={6}
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: 3,
            background: (theme) =>
              `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[50]} 100%)`
          }}
        >
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Database Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure and validate the MySQL connection used by this application. The database
            password is read from the <strong>DB_PASSWORD</strong> environment variable.
          </Typography>

          <Alert
            severity={passwordSet ? 'success' : 'warning'}
            icon={passwordSet ? <CheckCircleIcon /> : <ErrorIcon />}
            sx={{ mb: 3 }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.25}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
            >
              <Typography variant="body2">
                {passwordSet
                  ? 'DB_PASSWORD environment variable is set.'
                  : 'DB_PASSWORD environment variable is not set. The connection will fail without a password.'}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                color={passwordSet ? 'success' : 'warning'}
                onClick={() => setPasswordHelpOpen(true)}
              >
                How to set DB_PASSWORD
              </Button>
            </Stack>
          </Alert>

          <Stack spacing={2}>
            <TextField
              label="Host"
              value={form.host}
              onChange={handleChange('host')}
              placeholder="localhost"
              fullWidth
            />
            <TextField
              label="Port"
              value={form.port}
              onChange={handleChange('port')}
              placeholder="3306"
              type="number"
              fullWidth
            />
            <TextField
              label="Database Name"
              value={form.database}
              onChange={handleChange('database')}
              placeholder="informing_choices"
              fullWidth
              required
            />
            <TextField
              label="Username"
              value={form.user}
              onChange={handleChange('user')}
              placeholder="root"
              fullWidth
              required
            />
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            sx={{ mb: 2 }}
          >
            <Typography variant="subtitle1" fontWeight={700}>
              Database Health
            </Typography>
            <Chip
              label={
                healthLoading
                  ? 'Checking...'
                  : health?.ok
                    ? 'Healthy'
                    : health?.connected
                      ? 'Issues Found'
                      : 'Disconnected'
              }
              color={health?.ok ? 'success' : health?.connected ? 'warning' : 'default'}
              size="small"
            />
          </Stack>

          {health && (
            <Alert severity={health.ok ? 'success' : 'warning'} sx={{ mb: 2 }}>
              {health.message}
              <br />
              {`Schema: ${health.schemaValid ? 'valid' : 'invalid'}, migrations: ${health.appliedMigrations}/${health.expectedMigrations} applied.`}
              {health.requiredTablesMissing?.length > 0 && (
                <>
                  <br />
                  {`Missing tables: ${health.requiredTablesMissing.join(', ')}`}
                </>
              )}
            </Alert>
          )}

          {testResult && (
            <Alert severity={testResult.ok ? 'success' : 'error'} sx={{ mb: 2 }}>
              {testResult.ok
                ? 'Connection test successful.'
                : `Connection test failed: ${testResult.error}`}
            </Alert>
          )}

          {setupResult && (
            <Alert severity={setupResult.ok ? 'success' : 'error'} sx={{ mb: 2 }}>
              {setupResult.ok
                ? 'Database setup successful. Connection is active.'
                : `Database setup failed: ${setupResult.error}`}
            </Alert>
          )}

          {migrateResult && (
            <Alert severity={migrateResult.ok ? 'success' : 'error'} sx={{ mb: 2 }}>
              {migrateResult.ok
                ? 'Schema migration completed successfully.'
                : `Schema migration failed: ${migrateResult.error}`}
            </Alert>
          )}

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            justifyContent="flex-end"
            sx={{ flexWrap: 'wrap' }}
          >
            <Button
              variant="outlined"
              onClick={refreshHealth}
              disabled={healthLoading || testing || settingUp || migrating}
            >
              {healthLoading ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
              Refresh Health
            </Button>
            <Button
              variant="outlined"
              onClick={handleTest}
              disabled={
                testing ||
                settingUp ||
                migrating ||
                !form.host ||
                !form.port ||
                !form.database ||
                !form.user
              }
            >
              {testing ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
              Test Connection
            </Button>
            <Button
              variant="contained"
              onClick={handleSetupDatabase}
              disabled={
                settingUp ||
                testing ||
                migrating ||
                !form.host ||
                !form.port ||
                !form.database ||
                !form.user
              }
            >
              {settingUp ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
              Setup Database
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleMigrateSchema}
              disabled={migrating || testing || settingUp}
            >
              {migrating ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
              Migrate Schema
            </Button>
          </Stack>
        </Paper>
      </Stack>

      <Dialog open={passwordHelpOpen} onClose={() => setPasswordHelpOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Set DB_PASSWORD Environment Variable</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Typography variant="body2">
              This app reads the database password from the <strong>DB_PASSWORD</strong> environment
              variable. You should set it once at user level, then restart this app.
            </Typography>

            <Tabs
              value={passwordHelpPlatform}
              onChange={(_event, nextValue) => setPasswordHelpPlatform(nextValue)}
              variant="scrollable"
              allowScrollButtonsMobile
            >
              <Tab value="windows" label="Windows" />
              <Tab value="macos" label="macOS" />
              <Tab value="linux" label="Linux" />
            </Tabs>

            {passwordHelpPlatform === 'windows' && (
              <Stack spacing={2}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Option 1: Windows UI (recommended for most users)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  1. Press Windows key and search for Environment Variables.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  2. Open Edit the system environment variables.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  3. Click Environment Variables...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  4. Under User variables, click New...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  5. Variable name: DB_PASSWORD
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  6. Variable value: your MySQL password
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  7. Click OK on all dialogs to save.
                </Typography>

                <Typography variant="subtitle2" fontWeight={700}>
                  Option 2: PowerShell
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: 'grey.100',
                    overflowX: 'auto',
                    fontFamily: 'Consolas, monospace'
                  }}
                >
                  [Environment]::SetEnvironmentVariable('DB_PASSWORD', 'YOUR_PASSWORD_HERE', 'User')
                </Box>

                <Typography variant="subtitle2" fontWeight={700}>
                  Option 3: Command Prompt
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: 'grey.100',
                    overflowX: 'auto',
                    fontFamily: 'Consolas, monospace'
                  }}
                >
                  setx DB_PASSWORD "YOUR_PASSWORD_HERE"
                </Box>
              </Stack>
            )}

            {passwordHelpPlatform === 'macos' && (
              <Stack spacing={2}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Option 1: macOS UI (System Settings)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  1. Open System Settings.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  2. Go to Privacy &amp; Security, then open Developer Tools and Terminal permissions if needed.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  3. For launching from Finder, set DB_PASSWORD in your shell profile and restart the app.
                </Typography>

                <Typography variant="subtitle2" fontWeight={700}>
                  Option 2: Terminal (zsh default on macOS)
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: 'grey.100',
                    overflowX: 'auto',
                    fontFamily: 'Consolas, monospace'
                  }}
                >
                  {`echo 'export DB_PASSWORD="YOUR_PASSWORD_HERE"' >> ~/.zshrc
source ~/.zshrc`}
                </Box>

                <Typography variant="subtitle2" fontWeight={700}>
                  Option 3: Terminal (bash users)
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: 'grey.100',
                    overflowX: 'auto',
                    fontFamily: 'Consolas, monospace'
                  }}
                >
                  {`echo 'export DB_PASSWORD="YOUR_PASSWORD_HERE"' >> ~/.bash_profile
source ~/.bash_profile`}
                </Box>
              </Stack>
            )}

            {passwordHelpPlatform === 'linux' && (
              <Stack spacing={2}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Option 1: Linux UI (if your desktop supports it)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  GNOME example: Settings, About, Device name area, then search for Environment or Startup Apps,
                  or add DB_PASSWORD in your session/startup configuration tool.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  KDE example: System Settings, Startup and Shutdown, Environment Variables, add DB_PASSWORD.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  UI steps vary by distribution and desktop environment. If unavailable, use terminal options below.
                </Typography>

                <Typography variant="subtitle2" fontWeight={700}>
                  Option 2: Terminal (bash)
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: 'grey.100',
                    overflowX: 'auto',
                    fontFamily: 'Consolas, monospace'
                  }}
                >
                  {`echo 'export DB_PASSWORD="YOUR_PASSWORD_HERE"' >> ~/.bashrc
source ~/.bashrc`}
                </Box>

                <Typography variant="subtitle2" fontWeight={700}>
                  Option 3: Terminal (zsh)
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: 'grey.100',
                    overflowX: 'auto',
                    fontFamily: 'Consolas, monospace'
                  }}
                >
                  {`echo 'export DB_PASSWORD="YOUR_PASSWORD_HERE"' >> ~/.zshrc
source ~/.zshrc`}
                </Box>
              </Stack>
            )}

            <Typography variant="body2" color="text.secondary">
              After using one of the options above:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              1. Close all terminals and the app.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              2. Re-open the app.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              3. Click Refresh Health in Settings.
            </Typography>

            <Alert severity="info">
              For security, DB_PASSWORD is intentionally not editable inside the app UI.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setPasswordHelpOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={googleHelpOpen} onClose={() => setGoogleHelpOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Set Up Google Authentication</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Typography variant="body2">
              Follow these steps once to connect this app with Google Forms and Drive for imports and form
              operations.
            </Typography>

            <Tabs
              value={googleHelpStep}
              onChange={(_event, nextValue) => setGoogleHelpStep(nextValue)}
              variant="scrollable"
              allowScrollButtonsMobile
            >
              <Tab value="project" label="Step 1: Project" />
              <Tab value="apis" label="Step 2: APIs" />
              <Tab value="oauth" label="Step 3: OAuth" />
              <Tab value="app" label="Step 4: In App" />
            </Tabs>

            {googleHelpStep === 'project' && (
              <Stack spacing={1.25}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Create Google Cloud project
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  1. Open Google Cloud Console.
                </Typography>
                <Link href="https://console.cloud.google.com/" target="_blank" rel="noreferrer">
                  https://console.cloud.google.com/
                </Link>
                <Typography variant="body2" color="text.secondary">
                  2. Click project selector (top bar) and choose New Project.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  3. Enter project name, organization/location (if applicable), then click Create.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  4. Confirm this project is selected before configuring APIs and OAuth.
                </Typography>
              </Stack>
            )}

            {googleHelpStep === 'apis' && (
              <Stack spacing={1.25}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Enable required APIs
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Enable both APIs in your project from API Library:
                </Typography>
                <Link
                  href="https://console.cloud.google.com/apis/library"
                  target="_blank"
                  rel="noreferrer"
                >
                  https://console.cloud.google.com/apis/library
                </Link>
                <Typography variant="body2" color="text.secondary">
                  - Google Forms API
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  - Google Drive API
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Without these APIs, sign-in can succeed but Forms/Drive operations will fail.
                </Typography>
              </Stack>
            )}

            {googleHelpStep === 'oauth' && (
              <Stack spacing={1.25}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Configure OAuth consent and credentials
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  1. Open OAuth consent screen.
                </Typography>
                <Link
                  href="https://console.cloud.google.com/apis/credentials/consent"
                  target="_blank"
                  rel="noreferrer"
                >
                  https://console.cloud.google.com/apis/credentials/consent
                </Link>
                <Typography variant="body2" color="text.secondary">
                  2. Choose Audience:
                  Internal for Google Workspace org users only, or External for broader users.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  3. Complete app details (name, support email, developer contact email).
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  4. In Data Access, click Add or Remove Scopes and include:
                  drive.readonly, forms.body, forms.responses.readonly, userinfo.profile, openid.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  5. If Audience is External and app is Testing, add all intended accounts under Test users.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  6. Open Credentials and create OAuth Client ID with application type Desktop app,
                  then download credentials.json.
                </Typography>
                <Link
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                >
                  https://console.cloud.google.com/apis/credentials
                </Link>
                <Alert severity="warning">
                  Use OAuth desktop credentials JSON. Service account keys are not supported in this sign-in flow.
                </Alert>
              </Stack>
            )}

            {googleHelpStep === 'app' && (
              <Stack spacing={1.25}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Complete setup in this app
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  1. Click Select credentials.json and choose the file you downloaded.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  2. Wait for credential validation status.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  3. Click Sign In With Google and complete browser consent.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  4. Click Refresh Google Status and confirm Signed In.
                </Typography>
                <Typography variant="subtitle2" fontWeight={700} sx={{ pt: 0.5 }}>
                  Required scopes
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: 'grey.100',
                    overflowX: 'auto',
                    fontFamily: 'Consolas, monospace',
                    fontSize: 13
                  }}
                >
                  {`https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/forms.body
https://www.googleapis.com/auth/forms.responses.readonly
https://www.googleapis.com/auth/userinfo.profile
openid`}
                </Box>
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setGoogleHelpOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </ContainerWithBackground>
  );
}

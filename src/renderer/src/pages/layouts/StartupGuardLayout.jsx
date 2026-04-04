import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { useAuth } from '../../common/AuthContext';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography
} from '@mui/material';

function StatusRow({ label, ok, message }) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        {label}: {ok ? 'Ready' : 'Needs attention'}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}

export default function StartupGuardLayout() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const { refreshAuth } = useAuth();

  async function refreshReadiness() {
    setChecking(true);
    try {
      const nextStatus = await window.api.startup.getReadiness();
      setStatus(nextStatus);
    } catch (error) {
      setStatus({
        ready: false,
        db: {
          ready: false,
          message: error?.message || 'Failed to check database readiness.'
        },
        google: {
          ready: false,
          credentialStatus: { valid: false },
          authenticated: false,
          message: error?.message || 'Failed to check Google readiness.'
        }
      });
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    refreshReadiness();
  }, []);

  const canPromptGoogleSignIn =
    Boolean(status?.google?.credentialStatus?.valid) && !Boolean(status?.google?.authenticated);

  const handleGoogleSignIn = async () => {
    setBusy(true);
    try {
      await window.api.googleAuth.ensureAuthenticated();
      setBusy(false);
      refreshAuth();
    } catch (error) {
      console.warn('Google sign-in failed:', error);
      setBusy(false);
      await refreshReadiness();
    }
  };

  const handleCancelSignIn = async () => {
    try {
      await window.api.googleAuth.cancelOAuthFlow();
    } catch (error) {
      console.warn('Failed to cancel OAuth flow:', error);
    } finally {
      setBusy(false);
      await refreshReadiness();
    }
  };

  if (checking && !status) {
    return (
      <Dialog open={true}>
        <DialogContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
          <CircularProgress size={24} />
          <Typography>Checking application readiness...</Typography>
        </DialogContent>
      </Dialog>
    );
  }

  if (!status?.ready) {
    return (
      <>
        <Dialog open={true} onClose={(event) => event.preventDefault()}>
          <DialogTitle>Setup Required Before Continuing</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 0.5, minWidth: { xs: 280, sm: 520 } }}>
              <Alert severity="warning">
                This app needs both a valid database connection and Google account authorization
                before data pages can be opened.
              </Alert>

              <StatusRow label="Database" ok={Boolean(status?.db?.ready)} message={status?.db?.message} />
              <StatusRow label="Google" ok={Boolean(status?.google?.ready)} message={status?.google?.message} />
            </Stack>
          </DialogContent>
          <DialogActions>
            {!busy && (
              <>
                <Button onClick={refreshReadiness} disabled={checking || busy} variant="outlined">
                  {checking ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                  Retry Checks
                </Button>
                <Button onClick={() => navigate('/settings')} disabled={checking || busy} variant="contained">
                  Open Settings
                </Button>
                <Button
                  onClick={handleGoogleSignIn}
                  disabled={checking || busy || !canPromptGoogleSignIn}
                  variant="contained"
                  color="secondary"
                >
                  {busy ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                  Sign In With Google
                </Button>
              </>
            )}
            {busy && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                  Opening Google sign-in in your browser...
                </Typography>
                <Button onClick={handleCancelSignIn} disabled={!busy} variant="outlined" color="error">
                  Cancel Sign In
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>
      </>
    );
  }

  return <Outlet />;
}

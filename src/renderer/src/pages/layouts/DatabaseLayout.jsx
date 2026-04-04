import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography
} from '@mui/material';
import SkeletonAppBar from '../../components/skeletons/SkeletonAppBar';

export default function DatabaseLayout() {
  const [status, setStatus] = useState(null); // null = checking, true = connected, false = not connected
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  async function checkConnection() {
    setChecking(true);
    try {
      const connected = await window.api.dbSettings.isConnected();
      setStatus(connected);
    } catch {
      setStatus(false);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    checkConnection();
  }, []);

  if (checking) {
    return (
      <>
        <SkeletonAppBar />
        <Dialog open={true} onClose={(e) => e.preventDefault()}>
          <DialogContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
            <CircularProgress size={24} />
            <Typography>Connecting to database…</Typography>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (!status) {
    return (
      <>
        <SkeletonAppBar />
        <Dialog open={true} onClose={(e) => e.preventDefault()}>
          <DialogTitle>Database Not Connected</DialogTitle>
          <DialogContent>
            <Typography gutterBottom>
              The application could not connect to the MySQL database. Please configure your
              connection settings and ensure the database server is running.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The database password is read from the{' '}
              <strong>DB_PASSWORD</strong> environment variable.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button variant="outlined" onClick={checkConnection}>
              Retry
            </Button>
            <Button variant="contained" onClick={() => navigate('/settings')}>
              Go to Settings
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  return <Outlet />;
}

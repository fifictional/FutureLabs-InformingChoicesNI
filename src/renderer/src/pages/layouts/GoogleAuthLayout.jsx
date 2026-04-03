import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import SkeletonAppBar from "../../components/skeletons/SkeletonAppBar";

function resolveAuthErrorMessage(err) {
    const message = err?.message || '';
    if (message.includes('No Google credentials were found') || err?.code === 'GOOGLE_CREDENTIALS_MISSING') {
        return 'No Google credentials found. Please add credentials/credentials.json and restart the app.';
    }

    return 'Error checking Google authentication: ' + (message || 'Unknown error');
}

export default function GoogleAuthLayout() {
    const [isAuthenticated, setIsAuthenticated] = useState(null);
    const [error, setError] = useState(null);
    const [waitingLogin, setWaitingLogin] = useState(false);

    useEffect(() => {
        async function checkAuth() {
            try {
                const authenticated = await window.api.googleAuth.isUserAuthenticated();
                setIsAuthenticated(authenticated);
                if (!authenticated) {
                    setError(null);
                }
            } catch (err) {
                setIsAuthenticated(false);
                setError(resolveAuthErrorMessage(err));
            }
        }
        checkAuth();
    }, []);

    const handleLoginClick = async () => {
        try {
            setWaitingLogin(true);
            const response = await window.api.googleAuth.ensureAuthenticated();
            if (response === true) {
                setIsAuthenticated(true);
                setError(null);
                return;
            }

            setIsAuthenticated(false);
            setError('Google authentication failed, contact developers if this issue persists.');
        } catch (err) {
            setIsAuthenticated(false);
            setError(resolveAuthErrorMessage(err));
        } finally {
            setWaitingLogin(false);
        }
    }

    const handleClose = () => {
        window.api.window.close();
    }

    if (isAuthenticated === false) {
        return (
            <>
            <SkeletonAppBar />
            <Dialog open={true} onClose={(e) => e.preventDefault()}>
                {waitingLogin ?
                    <CircularProgress />
                 : error ?
                    <>
                    <DialogTitle>Authentication Error</DialogTitle>
                    <DialogContent>
                        <p>{error}</p>
                        <p>Please add the credentials file and restart the app, then try again.</p>
                    </DialogContent>
                    <DialogActions>
                        <Button variant="contained" onClick={handleLoginClick}>
                            Retry Google Sign-In
                        </Button>
                    </DialogActions>
                    </>
                 :
                    <>
                    <DialogTitle>Sign In with Google</DialogTitle>
                    <DialogContent>
                        <p>You need to log in with your Google account for the application to access your forms. Please click the button below to authenticate.</p>
                        <p>When you click the button, your default browser will open and Google will ask you to sign in and consent to the necessary permissions to run this application.</p>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose} variant="outlined" color="error">
                            Close app
                        </Button>
                        <Button onClick={handleLoginClick} variant="contained">
                            I consent, take me to Google Sign-In
                        </Button>
                    </DialogActions>
                    </>
                }
            </Dialog>
            </>
        )
    }

    if (!isAuthenticated) {
        return <div>Checking authentication...</div>;
    }

  return (
    <Outlet />
  );
}

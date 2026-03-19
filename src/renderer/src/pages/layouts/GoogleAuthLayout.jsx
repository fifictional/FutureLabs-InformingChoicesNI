import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import { Button, CircularProgress, Container, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";

export default function GoogleAuthLayout() {
    const [isAuthenticated, setIsAuthenticated] = useState(null);
    const [error, setError] = useState(null);
    const [waitingLogin, setWaitingLogin] = useState(false);

    useEffect(() => {
        async function checkAuth() {
            try {
                const authenticated = await window.api.googleAuth.isUserAuthenticated();
                setIsAuthenticated(authenticated);
                console.log('Google authentication status:', isAuthenticated);
            } catch (err) {
                setError('Error checking Google authentication: ' + err.message);
            }
        }
        checkAuth();
    }, []);

    const handleLoginClick = async () => {
        setWaitingLogin(true);
        const response = await window.api.googleAuth.ensureAuthenticated();
        setWaitingLogin(false);
        if (response) {
            setIsAuthenticated(true);
        } else {
            setError('Google authentication failed, contact developers if this issue persists.');
        }
    }

    if (isAuthenticated === null) {
        return <div>Checking authentication...</div>;
    }

    if (isAuthenticated === false) {
        return (
            <Dialog open={true} onClose={(e) => e.preventDefault()}> 
                {waitingLogin ? 
                    <CircularProgress />
                 : error ?
                    <>
                    <DialogTitle>Authentication Error</DialogTitle>
                    <DialogContent>
                        <p>{error}</p>
                        <p>Please try again. If the issue persists, contact the developers.</p>
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
                        <Button onClick={handleLoginClick} variant="contained">
                            I consent, take me to Google Sign-In
                        </Button>
                    </DialogActions>
                    </>
                }
            </Dialog>
        )
    }

  return (
    <Outlet />
  );
}
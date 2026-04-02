import {
    AppBar,
    Avatar,
    Box,
    Button,
    css,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItemButton,
    ListItemText,
    Stack,
    Toolbar,
    Typography,
    useTheme
} from "@mui/material";
import { useEffect, useState } from "react";
import CloseIcon from '@mui/icons-material/Close';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import MenuIcon from '@mui/icons-material/Menu';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Link, Outlet, useLocation, useNavigate } from "react-router";

const drawerWidth = 260;

export default function AppBarLayout() {

    const theme = useTheme();
    const [userInfo, setUserInfo] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const navigationItems = [
        { label: 'Home', to: '/' },
        { label: 'Clients', to: '/clients' },
        { label: 'Surveys', to: '/surveys' },
        { label: 'Events', to: '/events' },
        { label: 'Analysis', to: '/analysis' }
    ];

    useEffect(() => {
        async function fetchUserInfo() {
            try {
                const info = await window.api.googleAuth.getUserProfile();
                setUserInfo(info);
            } catch (err) {
                console.error('Error fetching user info:', err);
            }
        }
        fetchUserInfo();
    }, []);

    const appBarStyle = css`
        app-region: drag;
        -webkit-app-region: drag;
        padding: 0;
        margin: 0;

        & .MuiButton-root {
            color: inherit;
            app-region: no-drag;
            -webkit-app-region: no-drag;
        }

        & .MuiToolbar-root {
            padding: 0;
            margin: 0;
            min-height: auto;
            justify-content: space-between;
        }
    `;

    const menusStyle = css`
        app-region: no-drag;
        -webkit-app-region: no-drag;

        & .MuiIconButton-root {
            color: inherit;
            border-radius: 0;
        }

        & .MuiSvgIcon-root {
            font-size: 16px;
        }
    `;

    const userPanelStyles = css`
        & > * {
            app-region: no-drag;
            -webkit-app-region: no-drag;
        }
    `;

    const windowControlsStyle = css`
        app-region: no-drag;
        -webkit-app-region: no-drag;

        & .MuiIconButton-root {
            color: inherit;
            border-radius: 0;
            padding: 1rem;
        }

        & .MuiSvgIcon-root {
            font-size: 16px;
        }

        & .MuiIconButton-root:last-child {
            background-color: ${theme.palette.error.main};
            color: ${theme.palette.error.contrastText};

            &:hover {
                background-color: ${theme.palette.error.dark};
            }
        }
    `;

    const menuButtonStyle = css`
        padding: 1rem;
    `;

    const arrowIconButtonStyle = css`
        color: inherit;
        border-radius: 0;

        & .MuiSvgIcon-root {
            font-size: 18px;
        }
    `;

    const drawerHeaderStyle = css`
        padding: 1rem 1.25rem 0.75rem;
    `;

    const isRouteActive = (targetPath) => {
        if (targetPath === '/') {
            return location.pathname === '/';
        }

        return location.pathname === targetPath || location.pathname.startsWith(`${targetPath}/`);
    };

    const handleNavigateFromDrawer = (targetPath) => {
        navigate(targetPath);
        setDrawerOpen(false);
    };

    const handleSignOut = async () => {
        try {
            await window.api.googleAuth.signOut();
        } catch (error) {
            console.error('Error signing out from Google:', error);
        } finally {
            setUserInfo(null);
            window.location.reload();
        }
    };

    return (
        <>
        <Drawer
            anchor="left"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            ModalProps={{ keepMounted: true }}
            PaperProps={{ sx: { width: drawerWidth } }}
        >
            <Box css={drawerHeaderStyle}>
                <Typography variant="h6" fontWeight="bold">Navigation</Typography>
                <Typography variant="body2" color="text.secondary">Move around the app.</Typography>
            </Box>
            <Divider />
            <List sx={{ pt: 0.5 }}>
                {navigationItems.map((item) => (
                    <ListItemButton
                        key={item.to}
                        selected={isRouteActive(item.to)}
                        onClick={() => handleNavigateFromDrawer(item.to)}
                    >
                        <ListItemText primary={item.label} />
                    </ListItemButton>
                ))}
            </List>
        </Drawer>
        <AppBar css={appBarStyle} position="fixed">
            <Toolbar>
                <Stack css={menusStyle} direction="row" alignItems="center" justifyContent="start">
                    <IconButton css={menuButtonStyle} onClick={() => setDrawerOpen(true)}><MenuIcon /></IconButton>
                    <IconButton css={arrowIconButtonStyle} onClick={() => navigate(-1)}><ArrowBackIcon /></IconButton>
                    <IconButton css={arrowIconButtonStyle} onClick={() => navigate(1)}><ArrowForwardIcon /></IconButton>
                    <Button component={Link} to="/">Home</Button>
                    <Button component={Link} to="clients">Clients</Button>
                    <Button component={Link} to="surveys">Surveys</Button>
                    <Button component={Link} to="events">Events</Button>
                    <Button component={Link} to="analysis">Analysis</Button>
                </Stack>
                {userInfo &&
                    <Stack css={userPanelStyles} spacing={2} direction="row" alignItems="center" justifyContent="start">
                        <Typography>{userInfo.name}</Typography>
                        <Avatar alt="User Avatar" src={userInfo.pictureBase64} />
                        <Button size="small" variant="outlined" onClick={handleSignOut}>Sign out</Button>
                    </Stack>
                }
                <Stack css={windowControlsStyle} direction="row" alignItems="center" justifyContent="start">
                    <IconButton onClick={() => window.api.window.minimize()}><HorizontalRuleIcon /></IconButton>
                    <IconButton onClick={() => window.api.window.maximizeToggle()}><CropSquareIcon /></IconButton>
                    <IconButton onClick={() => window.api.window.close()}><CloseIcon /></IconButton>
                </Stack>
            </Toolbar>
        </AppBar>
        <Toolbar variant="dense" />
        <Outlet />
        </>
    );
}

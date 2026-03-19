import { AppBar, Avatar, Button, css, IconButton, Stack, Toolbar, Typography, useTheme } from "@mui/material";
import { heIL } from "@mui/material/locale";
import { useEffect, useState } from "react";
import CloseIcon from '@mui/icons-material/Close';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import MenuIcon from '@mui/icons-material/Menu';

export default function Home() {
    const theme = useTheme();
    const [userInfo, setUserInfo] = useState(null);

    useEffect(() => {
        async function fetchUserInfo() {
            try {
                const info = await window.api.googleAuth.getUserProfile();
                setUserInfo(info);
                console.log('Fetched user info:', info);
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
            padding: 1rem;
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

    return (
        <>
        <AppBar css={appBarStyle} position="static">
            <Toolbar>
                <Stack css={menusStyle} direction="row" alignItems="center" justifyContent="start">
                    <IconButton><MenuIcon /></IconButton>
                    <Button>Surveys</Button>
                    <Button>Events</Button>
                    <Button>Analysis</Button>
                </Stack>
                {userInfo &&
                    <Stack css={userPanelStyles} spacing={2} direction="row" alignItems="center" justifyContent="start">
                        <Typography>{userInfo.name}</Typography>
                        <Avatar alt="User Avatar" src={userInfo.pictureBase64} />
                    </Stack>
                }
                <Stack css={windowControlsStyle} direction="row" alignItems="center" justifyContent="start">
                    <IconButton onClick={() => window.api.window.minimize()}><HorizontalRuleIcon /></IconButton>
                    <IconButton onClick={() => window.api.window.maximizeToggle()}><CropSquareIcon /></IconButton>
                    <IconButton onClick={() => window.api.window.close()}><CloseIcon /></IconButton>
                </Stack>
            </Toolbar>
        </AppBar>
        </>
    );
}
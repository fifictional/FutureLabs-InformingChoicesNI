import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { createTheme, ThemeProvider } from '@mui/material';
import { HashRouter } from 'react-router';
import './assets/index.css';
import { text } from 'd3';

const theme = createTheme({
  typography: {
    fontFamily: [
      'Inter',
      'IBM Plex Sans',
      'Montserrat',
      'system-ui',
      'sans-serif'
    ].join(','),
  },
  palette: {
    primary: {
      main: '#4CAF50',
    },
    accent: {
      main: '#18385F',
      contrastText: '#FFFFFF',
    }
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <HashRouter>
        <App />
      </HashRouter>
    </ThemeProvider>
  </StrictMode>
);

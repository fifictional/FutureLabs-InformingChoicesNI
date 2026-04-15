import { Component } from 'react';
import { Box, Button, Typography, Container, Paper, Stack } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';

/**
 * Error Boundary component to catch React render errors
 * and prevent entire app from crashing
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#f5f5f5',
            p: 2
          }}
        >
          <Container maxWidth="sm">
            <Paper elevation={3} sx={{ p: 4 }}>
              <Stack spacing={3} alignItems="center">
                <ErrorIcon sx={{ fontSize: 60, color: 'error.main' }} />
                <Typography variant="h4" component="h1" fontWeight="bold">
                  Something Went Wrong
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
                  The application encountered an unexpected error. Please try refreshing the page or
                  restarting the application.
                </Typography>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <Box
                    sx={{
                      backgroundColor: '#f5f5f5',
                      border: '1px solid #ddd',
                      borderRadius: 1,
                      p: 2,
                      width: '100%',
                      overflow: 'auto',
                      maxHeight: 200
                    }}
                  >
                    <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {this.state.error.toString()}
                      {'\n\n'}
                      {this.state.errorInfo?.componentStack}
                    </Typography>
                  </Box>
                )}

                <Button
                  variant="contained"
                  onClick={this.handleReset}
                  sx={{ minWidth: 200 }}
                >
                  Try Again
                </Button>
              </Stack>
            </Paper>
          </Container>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

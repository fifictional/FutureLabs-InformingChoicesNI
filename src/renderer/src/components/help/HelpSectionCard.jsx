import { Alert, Paper, Stack, Typography } from '@mui/material';

export default function HelpSectionCard({ title, subtitle, children, tip }) {
  return (
    <Paper elevation={2} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2 }}>
      <Stack spacing={1.25}>
        <Typography variant="h6" fontWeight={700}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
        {tip ? <Alert severity="info">{tip}</Alert> : null}
        <Stack spacing={1.25}>{children}</Stack>
      </Stack>
    </Paper>
  );
}

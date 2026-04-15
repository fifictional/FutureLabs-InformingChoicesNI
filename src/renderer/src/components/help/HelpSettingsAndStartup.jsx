import { Alert, Box, Typography } from '@mui/material';
import HelpSectionCard from './HelpSectionCard';
import HelpGuideLayout from './HelpGuideLayout';

export default function HelpSettingsAndStartup() {
  return (
    <HelpSectionCard
      title="Settings, Startup Checks, And Common Fixes"
      subtitle="Use this section when the app is blocked at startup or when imports/features are not available."
    >
      <HelpGuideLayout
        intro="Use this sidebar when startup checks fail or settings actions do not behave as expected."
        sections={[
          {
            id: 'db-setup',
            label: 'Database Setup Steps',
            content: (
              <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
                <li><Typography variant="body2">Enter Host, Port, Database Name, Username.</Typography></li>
                <li><Typography variant="body2">Set DB_PASSWORD via OS environment variable.</Typography></li>
                <li><Typography variant="body2">Click Test Connection and resolve errors.</Typography></li>
                <li><Typography variant="body2">Click Setup Database.</Typography></li>
                <li><Typography variant="body2">Click Migrate Schema if pending migrations exist.</Typography></li>
                <li><Typography variant="body2">Click Refresh Health and confirm healthy status.</Typography></li>
              </Box>
            )
          },
          {
            id: 'google-cloud-prerequisites',
            label: 'Google Cloud Prerequisites',
            content: (
              <>
                <Typography variant="body2" fontWeight={700}>Before using Google features</Typography>
                <Typography variant="body2">1. Create/select a Google Cloud project.</Typography>
                <Typography variant="body2">2. Enable Google Forms API and Google Drive API.</Typography>
                <Typography variant="body2">3. Configure OAuth consent screen and add test users if needed.</Typography>
                <Typography variant="body2">4. Create OAuth Client ID as Desktop app.</Typography>
                <Typography variant="body2">5. Download credentials.json from Google Cloud.</Typography>
                <Alert severity="info" sx={{ mt: 1 }}>
                  Use OAuth desktop credentials JSON. Service account JSON is not supported in this flow.
                </Alert>
              </>
            )
          },
          {
            id: 'google-setup',
            label: 'Google Auth Setup Steps',
            content: (
              <>
                <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
                  <li><Typography variant="body2">Click Select credentials.json and choose OAuth client file.</Typography></li>
                  <li><Typography variant="body2">Check credential status message for validity.</Typography></li>
                  <li><Typography variant="body2">Click Sign In With Google and complete browser flow.</Typography></li>
                  <li><Typography variant="body2">Use Refresh Google Status to confirm signed in.</Typography></li>
                </Box>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Required OAuth scopes: drive.readonly, forms.body, forms.responses.readonly,
                  userinfo.profile, openid.
                </Typography>
              </>
            )
          },
          {
            id: 'startup-gate',
            label: 'Startup Gate Behavior',
            content: (
              <>
                <Alert severity="warning" sx={{ mb: 1 }}>
                  Main pages stay locked until startup checks pass.
                </Alert>
                <Typography variant="body2">This prevents data operations against an invalid database or missing auth state.</Typography>
                <Typography variant="body2">Use Settings to resolve issues, then retry checks.</Typography>
              </>
            )
          },
          {
            id: 'troubleshooting',
            label: 'Troubleshooting',
            content: (
              <>
                <Typography variant="body2">- DB connection fails: verify host/port and DB account rights.</Typography>
                <Typography variant="body2">- DB health warning: run migrations and refresh health.</Typography>
                <Typography variant="body2">- Credentials rejected: use OAuth client JSON (not service account).</Typography>
                <Typography variant="body2">- Google imports unavailable: sign out/sign in and refresh status.</Typography>
              </>
            )
          }
        ]}
      />
    </HelpSectionCard>
  );
}

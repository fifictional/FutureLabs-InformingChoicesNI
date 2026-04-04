import { Box, Typography } from '@mui/material';
import HelpSectionCard from './HelpSectionCard';
import HelpGuideLayout from './HelpGuideLayout';

export default function HelpGettingStarted() {
  return (
    <HelpSectionCard
      title="Getting Started"
      subtitle="Detailed first-run setup guide for non-technical users."
      tip="If the app shows a setup-required dialog at startup, open Settings and complete these steps in order."
    >
      <HelpGuideLayout
        intro="Use the left sidebar topics to complete setup in order."
        sections={[
          {
            id: 'first-open',
            label: 'First Open Checklist',
            content: (
              <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
                <li><Typography variant="body2">Open Settings from top bar or side menu.</Typography></li>
                <li><Typography variant="body2">Go to Database Settings and fill Host, Port, Database Name, Username.</Typography></li>
                <li><Typography variant="body2">Set DB_PASSWORD in your OS and return to app.</Typography></li>
                <li><Typography variant="body2">Click Test Connection and confirm success.</Typography></li>
                <li><Typography variant="body2">Click Setup Database, then Migrate Schema if needed.</Typography></li>
                <li><Typography variant="body2">Go to Google Authentication and select credentials.json.</Typography></li>
                <li><Typography variant="body2">Click Sign In With Google and complete browser sign-in.</Typography></li>
              </Box>
            )
          },
          {
            id: 'ready-check',
            label: 'Ready To Use Check',
            content: (
              <>
                <Typography variant="body2">Confirm all these before using main pages:</Typography>
                <Typography variant="body2">- Database Health shows healthy.</Typography>
                <Typography variant="body2">- No missing tables and no pending migrations.</Typography>
                <Typography variant="body2">- Google status shows signed in.</Typography>
                <Typography variant="body2">- Home, Surveys, Analysis pages open without startup prompt.</Typography>
              </>
            )
          },
          {
            id: 'if-blocked',
            label: 'If App Is Still Blocked',
            content: (
              <>
                <Typography variant="body2">If startup guard keeps blocking access:</Typography>
                <Typography variant="body2">1. Re-open Settings.</Typography>
                <Typography variant="body2">2. Click Refresh Health and Refresh Google Status.</Typography>
                <Typography variant="body2">3. If DB fails, re-check DB host/port/user/password combination.</Typography>
                <Typography variant="body2">4. If Google fails, re-select credentials file and sign in again.</Typography>
              </>
            )
          }
        ]}
      />
    </HelpSectionCard>
  );
}

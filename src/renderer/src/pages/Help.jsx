import { useMemo, useState } from 'react';
import { Alert, Box, Stack, Tab, Tabs, Typography } from '@mui/material';
import ContainerWithBackground from '../components/common/ContainerWithBackground';
import HelpGettingStarted from '../components/help/HelpGettingStarted';
import HelpDashboardClients from '../components/help/HelpDashboardClients';
import HelpSurveysImports from '../components/help/HelpSurveysImports';
import HelpEventsTags from '../components/help/HelpEventsTags';
import HelpAnalysisCharts from '../components/help/HelpAnalysisCharts';
import HelpSettingsAndStartup from '../components/help/HelpSettingsAndStartup';

export default function Help() {
  const sections = useMemo(
    () => [
      { key: 'start', label: 'Getting Started', render: () => <HelpGettingStarted /> },
      { key: 'dashboard', label: 'Home + Clients', render: () => <HelpDashboardClients /> },
      { key: 'surveys', label: 'Surveys + Imports', render: () => <HelpSurveysImports /> },
      { key: 'events', label: 'Events + Tags', render: () => <HelpEventsTags /> },
      { key: 'analysis', label: 'Analysis + Charts', render: () => <HelpAnalysisCharts /> },
      { key: 'settings', label: 'Settings + Startup', render: () => <HelpSettingsAndStartup /> }
    ],
    []
  );

  const [activeKey, setActiveKey] = useState(sections[0].key);
  const active = sections.find((section) => section.key === activeKey) || sections[0];

  return (
    <ContainerWithBackground>
      <Box sx={{ maxWidth: 1280, m: 'auto', px: { xs: 1, sm: 0 } }}>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="h4" fontWeight={800}>
              Help Center
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Detailed, step-by-step user guides for every area of the app.
            </Typography>
          </Stack>

          <Alert severity="info">
            Each tab includes a detailed sidebar guide with step-by-step instructions for individual features.
          </Alert>

          <Tabs
            value={active.key}
            onChange={(_event, value) => setActiveKey(value)}
            variant="scrollable"
            allowScrollButtonsMobile
          >
            {sections.map((section) => (
              <Tab key={section.key} label={section.label} value={section.key} />
            ))}
          </Tabs>

          {active.render()}
        </Stack>
      </Box>
    </ContainerWithBackground>
  );
}

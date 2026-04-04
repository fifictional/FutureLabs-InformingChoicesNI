import { Box, Typography } from '@mui/material';
import HelpSectionCard from './HelpSectionCard';
import HelpGuideLayout from './HelpGuideLayout';

export default function HelpDashboardClients() {
  return (
    <HelpSectionCard
      title="Home Dashboard And Clients"
      subtitle="Detailed user guide for dashboard monitoring and client management workflows."
    >
      <HelpGuideLayout
        intro="Select a feature on the left to see exact usage steps."
        sections={[
          {
            id: 'dashboard-basics',
            label: 'Dashboard Basics',
            content: (
              <>
                <Typography variant="body2">1. Set Start date and End date first for period-based reporting.</Typography>
                <Typography variant="body2">2. Click Refresh All Surveys before reading KPI values.</Typography>
                <Typography variant="body2">3. Review card values from top-left to bottom-right after refresh completes.</Typography>
              </>
            )
          },
          {
            id: 'metric-config',
            label: 'Configure Metric Cards',
            content: (
              <>
                <Typography variant="body2">1. Click edit icon on the metric card you want to configure.</Typography>
                <Typography variant="body2">2. Select the survey question that should drive that metric.</Typography>
                <Typography variant="body2">3. Save selection and return to dashboard.</Typography>
                <Typography variant="body2">4. Refresh to verify new metric mapping output.</Typography>
              </>
            )
          },
          {
            id: 'clients-and-appointments',
            label: 'Clients And Appointments',
            content: (
              <>
                <Typography variant="body2">- Add clients with initials/reference details for follow-up workflows.</Typography>
                <Typography variant="body2">- Use total appointment controls to increment/decrement or set exact totals.</Typography>
                <Typography variant="body2">- Save updates and confirm totals reflected in dashboard cards.</Typography>
              </>
            )
          }
        ]}
      />
    </HelpSectionCard>
  );
}

import { Box, Typography } from '@mui/material';
import HelpSectionCard from './HelpSectionCard';
import HelpGuideLayout from './HelpGuideLayout';

export default function HelpAnalysisCharts() {
  return (
    <HelpSectionCard
      title="Analysis And Charts"
      subtitle="Detailed chart-building guide with exact decisions for survey selection, chart type, and export-ready output."
    >
      <HelpGuideLayout
        intro="Pick a topic on the left to get detailed chart setup instructions."
        sections={[
          {
            id: 'chart-types',
            label: 'Choose The Right Chart Type',
            content: (
              <>
                <Typography variant="body2">- Question chart: one question summary.</Typography>
                <Typography variant="body2">- Comparison chart: compare two questions.</Typography>
                <Typography variant="body2">- Response trend: changes over time.</Typography>
                <Typography variant="body2">- Geographical chart: location distribution.</Typography>
                <Typography variant="body2">- Word cloud: common words in text responses.</Typography>
              </>
            )
          },
          {
            id: 'build-steps',
            label: 'Step-by-step Chart Build',
            content: (
              <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
                <li><Typography variant="body2">Click Add Chart on Analysis page.</Typography></li>
                <li><Typography variant="body2">Enter a clear chart name first.</Typography></li>
                <li><Typography variant="body2">Select surveys, then question(s).</Typography></li>
                <li><Typography variant="body2">Use event/tag filters to narrow selection.</Typography></li>
                <li><Typography variant="body2">Set chart-specific options (trend interval/range, geo mode, etc.).</Typography></li>
                <li><Typography variant="body2">Save chart and verify output on Analysis page.</Typography></li>
              </Box>
            )
          },
          {
            id: 'trend-geo',
            label: 'Trend And Geo Specifics',
            content: (
              <>
                <Typography variant="body2" fontWeight={700}>Trend charts</Typography>
                <Typography variant="body2">- Pick interval (day/week/month/quarter/year) based on report cadence.</Typography>
                <Typography variant="body2">- Use cumulative for running totals, period for per-interval changes.</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ mt: 1.25 }}>Geo charts</Typography>
                <Typography variant="body2">- Choose all-locations mode or filtered-by-answer mode.</Typography>
                <Typography variant="body2">- Ensure response values use consistent place names.</Typography>
              </>
            )
          },
          {
            id: 'export-reorder',
            label: 'Export And Reorder',
            content: (
              <>
                <Typography variant="body2">- Use Download icon on chart card to export PNG.</Typography>
                <Typography variant="body2">- Drag charts using handle icon to reorder dashboard layout.</Typography>
                <Typography variant="body2">- Export captures chart area without action controls/date pickers.</Typography>
              </>
            )
          }
        ]}
      />
    </HelpSectionCard>
  );
}

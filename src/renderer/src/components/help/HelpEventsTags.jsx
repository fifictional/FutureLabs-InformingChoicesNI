import { Box, Typography } from '@mui/material';
import HelpSectionCard from './HelpSectionCard';
import HelpGuideLayout from './HelpGuideLayout';

export default function HelpEventsTags() {
  return (
    <HelpSectionCard
      title="Events And Tags"
      subtitle="Use events and tags as your reporting structure so filtering stays clean in Surveys and Analysis."
    >
      <HelpGuideLayout
        intro="Use events as primary grouping, and tags as secondary filters."
        sections={[
          {
            id: 'create-events',
            label: 'Create And Edit Events',
            content: (
              <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
                <li><Typography variant="body2">Click Create Event and enter a unique event name.</Typography></li>
                <li><Typography variant="body2">Optionally add description for reporting context.</Typography></li>
                <li><Typography variant="body2">Save event; if duplicate name exists, choose a different name.</Typography></li>
                <li><Typography variant="body2">Use Edit to update event title/description as workflows evolve.</Typography></li>
              </Box>
            )
          },
          {
            id: 'tags',
            label: 'Assign Tags Correctly',
            content: (
              <>
                <Typography variant="body2">- Add short, consistent tags (for example city, service line, age group).</Typography>
                <Typography variant="body2">- Similar tag spellings are normalized automatically.</Typography>
                <Typography variant="body2">- Use multiple tags when one event belongs to multiple categories.</Typography>
              </>
            )
          },
          {
            id: 'analysis-use',
            label: 'Use Events/Tags In Analysis',
            content: (
              <>
                <Typography variant="body2">1. In Configure Chart, start by event filter.</Typography>
                <Typography variant="body2">2. Add tag filter for narrower comparisons.</Typography>
                <Typography variant="body2">3. Confirm selected surveys match intended audience/timeframe.</Typography>
                <Typography variant="body2">4. Save chart once filtered data matches your reporting scope.</Typography>
              </>
            )
          }
        ]}
      />
    </HelpSectionCard>
  );
}

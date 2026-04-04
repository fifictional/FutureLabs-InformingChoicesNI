import { useState } from 'react';
import { Box, Paper, Stack, Typography, List, ListItemButton, ListItemText } from '@mui/material';

export default function HelpGuideLayout({ intro, sections }) {
  const [activeId, setActiveId] = useState(sections?.[0]?.id || '');
  const active = sections.find((section) => section.id === activeId) || sections[0];

  return (
    <Stack spacing={2}>
      {intro ? (
        <Typography variant="body2" color="text.secondary">
          {intro}
        </Typography>
      ) : null}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
        <Paper variant="outlined" sx={{ width: { xs: '100%', md: 280 }, borderRadius: 2 }}>
          <List sx={{ py: 0.5 }}>
            {sections.map((section) => (
              <ListItemButton
                key={section.id}
                selected={section.id === active?.id}
                onClick={() => setActiveId(section.id)}
              >
                <ListItemText primary={section.label} />
              </ListItemButton>
            ))}
          </List>
        </Paper>

        <Paper variant="outlined" sx={{ flex: 1, p: { xs: 2, sm: 2.5 }, borderRadius: 2 }}>
          <Stack spacing={1.25}>
            <Typography variant="h6" fontWeight={700}>
              {active?.label}
            </Typography>
            <Box>{active?.content}</Box>
          </Stack>
        </Paper>
      </Stack>
    </Stack>
  );
}

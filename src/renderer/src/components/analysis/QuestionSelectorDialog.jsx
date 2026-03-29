/* eslint-disable react/prop-types */

import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { useMemo, useState } from 'react';

export default function QuestionSelectorDialog({
  open,
  surveys,
  onClose,
  onSelectQuestion,
  questionFilter = 'all',
  title = 'Select a Question'
}) {
  const [selectedSurveyId, setSelectedSurveyId] = useState(null);

  const rows = useMemo(
    () =>
      surveys.map((survey) => ({
        id: survey.id,
        title: survey.name,
        event: survey.eventName || 'Unknown event',
        eventTags: survey.eventTags,
        eventTagsText: survey.eventTags.join(', ')
      })),
    [surveys]
  );

  const columns = useMemo(
    () => [
      { field: 'title', headerName: 'Survey', flex: 1.3, minWidth: 180 },
      { field: 'event', headerName: 'Event', flex: 1, minWidth: 140 },
      {
        field: 'eventTagsText',
        headerName: 'Event tags',
        flex: 1.2,
        minWidth: 160,
        renderCell: (params) => {
          const tags = params.row.eventTags || [];
          if (!tags.length) {
            return <Typography variant="caption">No tags</Typography>;
          }

          return (
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', py: 0.5 }}>
              {tags.map((tag) => (
                <Chip key={`${params.row.id}-${tag}`} label={tag} size="small" variant="outlined" />
              ))}
            </Stack>
          );
        }
      }
    ],
    []
  );

  const selectedSurvey = surveys.find((survey) => survey.id === selectedSurveyId) || null;

  const visibleQuestions = useMemo(() => {
    if (!selectedSurvey) {
      return [];
    }

    return selectedSurvey.questions.filter((question) => {
      if (questionFilter === 'text_only') {
        return question.answerType === 'text';
      }
      if (questionFilter === 'non_text') {
        return question.answerType !== 'text';
      }
      return true;
    });
  }, [questionFilter, selectedSurvey]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 0.5 }}>
          <Box sx={{ flex: 1.4, minWidth: 0 }}>
            <DataGrid
              rows={rows}
              columns={columns}
              autoHeight
              disableRowSelectionOnClick
              hideFooter
              slots={{ toolbar: GridToolbar }}
              slotProps={{ toolbar: { showQuickFilter: true } }}
              onRowClick={(params) => setSelectedSurveyId(params.row.id)}
            />
          </Box>

          <Divider flexItem orientation="vertical" sx={{ display: { xs: 'none', md: 'block' } }} />

          <Stack sx={{ flex: 1, minWidth: 0, maxHeight: 420 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              {selectedSurvey ? `Questions in ${selectedSurvey.name}` : 'Select a survey to view questions'}
            </Typography>
            <List dense sx={{ overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              {visibleQuestions.map((question) => (
                <ListItemButton
                  key={`${selectedSurvey.id}-${question.id}`}
                  onClick={() => onSelectQuestion(selectedSurvey.id, question)}
                >
                  <ListItemText
                    primary={question.text}
                    secondary={`Type: ${question.answerType}`}
                    slotProps={{ secondary: { sx: { textTransform: 'capitalize' } } }}
                  />
                </ListItemButton>
              ))}
              {selectedSurvey && visibleQuestions.length === 0 && (
                <Box sx={{ p: 2 }}>
                  <Typography color="text.secondary" variant="body2">
                    No compatible questions in this survey.
                  </Typography>
                </Box>
              )}
            </List>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}



/* eslint-disable react/prop-types */

import {
  Autocomplete,
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
  TextField,
  Typography
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';

export default function QuestionSelectorDialog({
  open,
  surveys,
  loading = false,
  onClose,
  onSelectQuestion,
  questionFilter = 'all',
  title = 'Select a Question'
}) {
  const [selectedSurveyId, setSelectedSurveyId] = useState(null);
  const [eventFilters, setEventFilters] = useState([]);
  const [tagFilters, setTagFilters] = useState([]);

  const normalizedSurveys = useMemo(
    () =>
      surveys.map((survey) => ({
        ...survey,
        event: survey.eventName || 'Unknown event',
        normalizedTags: (survey.eventTags || []).map((tag) => String(tag).trim()).filter(Boolean)
      })),
    [surveys]
  );

  const eventOptions = useMemo(
    () => [...new Set(normalizedSurveys.map((survey) => survey.event))].sort((a, b) => a.localeCompare(b)),
    [normalizedSurveys]
  );

  const tagOptions = useMemo(
    () =>
      [...new Set(normalizedSurveys.flatMap((survey) => survey.normalizedTags))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [normalizedSurveys]
  );

  useEffect(() => {
    setEventFilters((previous) => previous.filter((eventName) => eventOptions.includes(eventName)));
  }, [eventOptions]);

  useEffect(() => {
    setTagFilters((previous) => previous.filter((tag) => tagOptions.includes(tag)));
  }, [tagOptions]);

  const rows = useMemo(() => {
    const filtered = normalizedSurveys.filter((survey) => {
      if (eventFilters.length > 0 && !eventFilters.includes(survey.event)) {
        return false;
      }
      if (tagFilters.length > 0 && !tagFilters.some((tag) => survey.normalizedTags.includes(tag))) {
        return false;
      }

      return true;
    });

    return filtered
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((survey) => ({
      id: survey.id,
      title: survey.name,
      event: survey.event,
      eventTags: survey.normalizedTags,
      eventTagsText: survey.normalizedTags.join(', ')
    }));
  }, [eventFilters, normalizedSurveys, tagFilters]);

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
            return null;
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
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
            <Autocomplete
              multiple
              size="small"
              options={eventOptions}
              value={eventFilters}
              onChange={(_event, nextValue) => setEventFilters(nextValue)}
              disableCloseOnSelect
              disabled={loading}
              renderInput={(params) => <TextField {...params} label="Events" />}
              sx={{ flex: 1 }}
            />
            <Autocomplete
              multiple
              size="small"
              options={tagOptions}
              value={tagFilters}
              onChange={(_event, nextValue) => setTagFilters(nextValue)}
              disableCloseOnSelect
              disabled={loading}
              renderInput={(params) => <TextField {...params} label="Event tags" />}
              sx={{ flex: 1 }}
            />
          </Stack>

          <Typography variant="caption" color="text.secondary">
            Showing {rows.length} of {surveys.length} surveys
          </Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Box sx={{ flex: 1.4, minWidth: 0, height: 520, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <DataGrid
              rows={rows}
              columns={columns}
              disableRowSelectionOnClick
              pagination
              pageSizeOptions={[10]}
              initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
              loading={loading}
              onRowClick={(params) => setSelectedSurveyId(params.row.id)}
              sx={{ border: 'none', opacity: loading ? 0.7 : 1 }}
            />
          </Box>

          <Divider flexItem orientation="vertical" sx={{ display: { xs: 'none', md: 'block' } }} />

          <Stack sx={{ flex: 1, minWidth: 0, maxHeight: 420 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              {selectedSurvey ? selectedSurvey.name : ''}
            </Typography>
            <List
              dense
              sx={{
                overflowY: 'auto',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1
              }}
            >
              {visibleQuestions.map((question) => (
                <ListItemButton
                  key={`${selectedSurvey.id}-${question.id}`}
                  onClick={() => onSelectQuestion(selectedSurvey.id, question)}
                  disabled={loading}
                >
                  <ListItemText primary={question.text} />
                </ListItemButton>
              ))}
            </List>
          </Stack>
        </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

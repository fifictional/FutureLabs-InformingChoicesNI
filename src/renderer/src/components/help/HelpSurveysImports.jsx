import { Box, Typography } from '@mui/material';
import HelpSectionCard from './HelpSectionCard';
import HelpGuideLayout from './HelpGuideLayout';

export default function HelpSurveysImports() {
  return (
    <HelpSectionCard
      title="Surveys And Imports"
      subtitle="Complete guide for creating surveys, importing data, and avoiding common formatting mistakes."
      tip="Import accuracy depends on naming consistency, clean headers, and selecting the correct reference ID question when needed."
    >
      <HelpGuideLayout
        intro="Use the left menu to open detailed import/playbook instructions."
        sections={[
          {
            id: 'google-cloud-setup',
            label: 'Google Cloud Setup Prerequisite',
            content: (
              <>
                <Typography variant="body2">Google Forms import requires OAuth credentials configured in Settings first.</Typography>
                <Typography variant="body2">Enable Google Forms API and Google Drive API in your Google Cloud project.</Typography>
                <Typography variant="body2">Create OAuth Client ID of type Desktop app and use the downloaded credentials.json file.</Typography>
                <Typography variant="body2">Required scopes: drive.readonly, forms.body, forms.responses.readonly, userinfo.profile, openid.</Typography>
              </>
            )
          },
          {
            id: 'surveys-page',
            label: 'Surveys Page Actions',
            content: (
              <>
                <Typography variant="body2">- Create Survey: creates a new Google Form and links it.</Typography>
                <Typography variant="body2">- Edit Survey: rename survey, reassign event, update reference question.</Typography>
                <Typography variant="body2">- View Data: inspect responses per question and refresh responses.</Typography>
                <Typography variant="body2">- Delete: removes survey records from app.</Typography>
              </>
            )
          },
          {
            id: 'google-import',
            label: 'Google Forms Import Steps',
            content: (
              <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
                <li><Typography variant="body2">Open Surveys and choose Google Forms import.</Typography></li>
                <li><Typography variant="body2">Select one or more forms in picker view.</Typography></li>
                <li><Typography variant="body2">For each form, set Event Name (required).</Typography></li>
                <li><Typography variant="body2">Optionally set survey display name override.</Typography></li>
                <li><Typography variant="body2">Optionally set reference ID text question.</Typography></li>
                <li><Typography variant="body2">Run import and confirm each form shows successful status.</Typography></li>
              </Box>
            )
          },
          {
            id: 'excel-format',
            label: 'Excel Format Requirements',
            content: (
              <>
                <Typography variant="body2" fontWeight={700}>Mandatory workbook structure</Typography>
                <Typography variant="body2">- First sheet is used for response rows.</Typography>
                <Typography variant="body2">- Row 1 must contain headers.</Typography>
                <Typography variant="body2">- Each row after Row 1 is one response submission.</Typography>
                <Typography variant="body2">- Empty worksheets fail import.</Typography>

                <Typography variant="body2" fontWeight={700} sx={{ mt: 1.25 }}>Recognized special headers</Typography>
                <Typography variant="body2">- Survey name column aliases: Form Name, Survey Name, Form</Typography>
                <Typography variant="body2">- Event column aliases: Event Name, Event</Typography>
                <Typography variant="body2">- Date/timestamp aliases: Timestamp, Submitted At, Date, Submitted</Typography>

                <Typography variant="body2" fontWeight={700} sx={{ mt: 1.25 }}>Required during import</Typography>
                <Typography variant="body2">- Survey name must be present (from sheet or import form input).</Typography>
                <Typography variant="body2">- Event name must be available per row or via fallback event input.</Typography>
                <Typography variant="body2">- At least one question column is required.</Typography>
              </>
            )
          },
          {
            id: 'excel-metadata',
            label: 'Question Metadata Sheet',
            content: (
              <>
                <Typography variant="body2">Add a second sheet to force exact question types/choices.</Typography>
                <Typography variant="body2">Supported question reference columns:</Typography>
                <Typography variant="body2">- Question, Question Text, Question Header, Column, Column Name, Field</Typography>
                <Typography variant="body2">Supported answer type columns:</Typography>
                <Typography variant="body2">- Answer Type, AnswerType, Type</Typography>
                <Typography variant="body2">Supported choices columns:</Typography>
                <Typography variant="body2">- Choices, Choice, Options, Option</Typography>
                <Typography variant="body2">Allowed answer type values:</Typography>
                <Typography variant="body2">- text/string, number/numeric/float/integer/int, choice/select/radio/dropdown/enum</Typography>
                <Typography variant="body2">Choices can be pipe/comma/semicolon separated or JSON array.</Typography>
              </>
            )
          },
          {
            id: 'reference-id',
            label: 'Reference ID Guidance',
            content: (
              <>
                <Typography variant="body2">Pick a stable text question for reference ID mapping (for example case code).</Typography>
                <Typography variant="body2">Use consistent formatting in source data to avoid mismatches.</Typography>
                <Typography variant="body2">Changing reference question later recalculates stored reference IDs for that survey.</Typography>
              </>
            )
          }
        ]}
      />
    </HelpSectionCard>
  );
}

# Analysis Page Specification

## Toolbar

The top of the Analysis page provides a toolbar that spans the entire width of the page.

The toolbar includes an "Add Chart" button.
When this button is clicked, a dropdown menu with the following options appear.
1. "Add question chart..."
2. "Add comparison chart..."
3. "Add word cloud..."


## Add question chart

When the user clicks "Add question chart...", a question block is added to the page.
Each question block contains the following elements.
1. The text of the question being analysed. Initialised to "No question selected".
2. A button for selecting the question being analysed.
3. A checkbox list of surveys across which responses to the selected question are aggregated and analysed. Initialised to an empty list.
4. A date picker for selecting the start of the date range by which responses are filtered. No date is selected by default.
5. A date picker for selecting the end of the date range by which responses are filtered. No date is selected by default.
6. A chart showing the distribution of responses to the selected question across all surveys included in the checkbox list, and within the date range specified by the date pickers. Initialised to an empty chart.

When the question selection button is clicked, a table of all currently existing surveys, including their title, event and event tags, appears.
Users may sort and filter rows by any of these columns.
When a user clicks on a listed survey, all its questions are shown.
When a user selects a listed question, the table collapses and the question block is updated as follows:
1. The question text is updated to show the text of the selected question.
2. The checkbox list is updated to include all surveys that contain identical instances of the selected question.
3. The date pickers are updated to show the earliest and latest response dates across all responses to the selected question in the surveys included in the checkbox list.
4. The chart is updated to reflect the above changes.
   - If the question is a multiple-choice question, a bar chart is used to show the distribution of responses across all options.
   - If the question has numerical answers, a histogram is used to show the distribution of responses across all numerical values.
   - If the question has textual answers, a word cloud is used to show the distribution of responses across all answers.


## Add comparison chart

When the user clicks "Add comparison chart...", a comparison block is added to the page.
Each comparison block contains the following elements.
1. The text of the first question being compared. Initialised to "No question selected".
2. The text of the second question being compared. Initialised to "No question selected".
3. For each question, a button for selecting the question being used for comparison.
4. For each question, a checkbox list of surveys across which responses to the question are aggregated and analysed. Initialised to an empty list.
5. A date picker for selecting the start of the date range by which responses are filtered. No date is selected by default.
6. A date picker for selecting the end of the date range by which responses are filtered. No date is selected by default.
7. A chart comparing the distribution of responses to both questions across surveys selected in the checkbox lists, and within the date range specified by the date pickers. Initialised to an empty chart.

The question selection buttons behave identically to that in the question block.
Questions with textual answers cannot be compared, so only multiple-choice and numerical questions can be selected.

- If both questions are multiple-choice questions, a heat map grid is used to show the distribution of responses across all options for both questions.
  - The rows of the heat map grid correspond to the options of the first question, and the columns correspond to the options of the second question.
  - The colour intensity of each cell in the heat map grid corresponds to the number of different respondents who selected the corresponding options for both questions.
- If both questions have numerical answers, a scatter plot is used to show the distribution of numerical responses for both questions.
  - Each dot in the scatter plot corresponds to a different respondent who answered both questions.
- If one question has multiple-choice answers and the other has numerical answers, a stacked histogram is used to show the distribution of numerical responses for each multiple-choice option.


## Blocks

(1) Blocks should be laid out across the page in a grid-like fashion, with a maximum of 2 blocks per row.


## Implementation guide

Extract reusable components.

Ensure that all components are fully functional.

Use actual data from the database to populate dropdowns and charts.
Do not use hardcoded or mocked data.

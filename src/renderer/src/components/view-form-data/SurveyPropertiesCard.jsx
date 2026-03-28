import { Card, CardContent, Divider, Stack, Typography } from "@mui/material";
import { css } from "@emotion/react";

const propertiesCardCss = css`
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
`;

const propertyRowCss = css`
    font-size: 0.95rem;
`;

export default function SurveyPropertiesCard({ surveyData, eventName, questionCount, submissionCount }) {
    return (
        <Card>
            <CardContent>
                <Stack spacing={1} css={propertiesCardCss}>
                    <Typography variant="h6">Survey Properties</Typography>
                    <Divider />
                    <Typography css={propertyRowCss}><strong>Name:</strong> {surveyData.name}</Typography>
                    <Typography css={propertyRowCss}><strong>ID:</strong> {surveyData.id}</Typography>
                    <Typography css={propertyRowCss}><strong>Provider:</strong> {surveyData.provider}</Typography>
                    <Typography css={propertyRowCss}><strong>Event:</strong> {eventName}</Typography>
                    <Typography css={propertyRowCss}><strong>Questions:</strong> {questionCount}</Typography>
                    <Typography css={propertyRowCss}><strong>Submissions:</strong> {submissionCount}</Typography>
                </Stack>
            </CardContent>
        </Card>
    );
}

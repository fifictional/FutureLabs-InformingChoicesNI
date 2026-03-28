import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { css } from "@emotion/react";
import NumericQuestionSection from "./NumericQuestionSection";
import TextResponsesSection from "./TextResponsesSection";

const questionHeaderCss = css`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
`;

const questionTitleCss = css`
    font-weight: 600;
`;

const questionMetaCss = css`
    color: #666;
    font-size: 0.875rem;
`;

const questionContentCss = css`
    display: flex;
    flex-direction: column;
    gap: 1rem;
`;

export default function QuestionCard({ question, searchValue, onSearchChange }) {
    return (
        <Card>
            <CardContent>
                <Stack spacing={2}>
                    <Box css={questionHeaderCss}>
                        <Typography variant="h6" css={questionTitleCss}>
                            {question.label}
                        </Typography>
                        <Typography color="text.secondary" variant="body2" css={questionMetaCss}>
                            Question ID: {question.questionId}
                        </Typography>
                        <Typography color="text.secondary" variant="body2" css={questionMetaCss}>
                            Responses recorded: {question.responseCount}
                        </Typography>
                    </Box>

                    <Box css={questionContentCss}>
                        {question.isNumeric ? (
                            <NumericQuestionSection question={question} />
                        ) : (
                            <TextResponsesSection
                                question={question}
                                searchValue={searchValue || ""}
                                onSearchChange={onSearchChange}
                            />
                        )}
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
}

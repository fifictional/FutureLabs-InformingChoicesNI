import { Alert, Box, Paper, Stack, Typography } from "@mui/material";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { css } from "@emotion/react";
import { formatTickLabel } from "./utils";

const statsPanel = css`
    padding: 1rem;
    background-color: #f5f5f5;
    border-left: 4px solid #2e7d32;
    border-radius: 4px;
`;

const statsTitle = css`
    font-weight: bold;
    margin-bottom: 0.5rem;
`;

const chartContainer = css`
    width: 100%;
    height: 320px;
`;

export default function NumericQuestionSection({ question }) {
    if (!question.stats) {
        return null;
    }

    return (
        <>
            <Paper elevation={0} css={statsPanel}>
                <Typography variant="subtitle2" css={statsTitle}>
                    Statistics
                </Typography>
                <Stack spacing={0.5}>
                    <Typography variant="body2">
                        <strong>Count:</strong> {question.stats.count}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Mean:</strong> {question.stats.mean}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Median:</strong> {question.stats.median}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Min:</strong> {question.stats.min} | <strong>Max:</strong> {question.stats.max}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Range:</strong> {question.stats.range}
                    </Typography>
                </Stack>
            </Paper>

            {question.chartData.length > 0 ? (
                <Box css={chartContainer}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={question.chartData}
                            margin={{ top: 10, right: 24, left: 0, bottom: 18 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="value"
                                type="number"
                                domain={question.xAxisDomain}
                                ticks={question.xAxisTicks}
                                tickFormatter={formatTickLabel}
                                label={{ value: "Value", position: "insideBottomRight", offset: -5 }}
                            />
                            <YAxis
                                allowDecimals={false}
                                label={{ value: "Frequency", angle: -90, position: "insideLeft" }}
                            />
                            <Tooltip />
                            <Bar dataKey="count" fill="#2e7d32" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Box>
            ) : (
                <Alert severity="info">No numeric answers available for this question.</Alert>
            )}
        </>
    );
}

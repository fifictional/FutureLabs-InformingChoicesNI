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

function isLikertLikeScale(values) {
    if (!values.length) {
        return false;
    }

    const allIntegers = values.every((value) => Number.isInteger(value));
    if (!allIntegers) {
        return false;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    return range <= 10;
}

function resolveDiscreteScaleRange(min, max) {
    if (min >= 1 && max <= 5) {
        return [1, 5];
    }

    if (min >= 1 && max <= 7) {
        return [1, 7];
    }

    if (min >= 0 && max <= 10) {
        return [0, 10];
    }

    return [min, max];
}

function buildDiscreteSeries(chartData) {
    if (!chartData?.length) {
        return [];
    }

    const values = chartData.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const [start, end] = resolveDiscreteScaleRange(min, max);
    const countsByValue = new Map(chartData.map((point) => [point.value, point.count]));

    return Array.from({ length: end - start + 1 }, (_, index) => {
        const value = start + index;
        return {
            value,
            count: countsByValue.get(value) || 0
        };
    });
}

export default function NumericQuestionSection({ question }) {
    if (!question.stats) {
        return null;
    }

    const numericValues = (question.chartData || []).map((point) => point.value);
    const useDiscreteScale = isLikertLikeScale(numericValues);
    const seriesData = useDiscreteScale ? buildDiscreteSeries(question.chartData) : question.chartData;

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

            {seriesData.length > 0 ? (
                <Box css={chartContainer}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={seriesData}
                            margin={{ top: 10, right: 24, left: 0, bottom: 18 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="value"
                                type={useDiscreteScale ? "category" : "number"}
                                domain={useDiscreteScale ? undefined : question.xAxisDomain}
                                ticks={useDiscreteScale ? undefined : question.xAxisTicks}
                                tickFormatter={formatTickLabel}
                                label={{ value: "Value", position: "insideBottomRight", offset: -5 }}
                            />
                            <YAxis
                                allowDecimals={false}
                                label={{ value: "Frequency", angle: -90, position: "insideLeft" }}
                            />
                            <Tooltip />
                            <Bar dataKey="count" fill="#2e7d32" radius={[4, 4, 0, 0]} maxBarSize={48} />
                        </BarChart>
                    </ResponsiveContainer>
                </Box>
            ) : (
                <Alert severity="info">No numeric answers available for this question.</Alert>
            )}
        </>
    );
}

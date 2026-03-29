import { Alert, Box } from "@mui/material";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { css } from "@emotion/react";

const chartContainer = css`
    width: 100%;
    height: 320px;
`;

export default function ChoiceQuestionSection({ question }) {
    if (!question.chartData || question.chartData.length === 0) {
        return <Alert severity="info">No choice answers available for this question.</Alert>;
    }

    return (
        <Box css={chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={question.chartData}
                    margin={{ top: 10, right: 24, left: 0, bottom: 18 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="value"
                        type="category"
                        interval={0}
                        tick={{ fontSize: 12 }}
                    />
                    <YAxis
                        allowDecimals={false}
                        label={{ value: "Frequency", angle: -90, position: "insideLeft" }}
                    />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1976d2" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </Box>
    );
}

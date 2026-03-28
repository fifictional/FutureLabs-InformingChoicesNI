import { Box, css } from "@mui/material";


export default function ContainerWithBackground({ children }) {
    const backgroundStyle = css`
    background-color: #f5f5f5;
    width: 100%;
    height: 100%;
    `;    

    const containerStyle = css`
    margin: 0 auto;
    padding: 2rem;
    `;

    return (
        <>
        <Box css={backgroundStyle}>
            <Box css={containerStyle}>
                {children}
            </Box>
        </Box>
        </>
    );
}
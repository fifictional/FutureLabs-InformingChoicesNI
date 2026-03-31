import { Box, css } from "@mui/material";


export default function ContainerWithBackground({ children }) {
    const backgroundStyle = css`
    background-color: #f5f5f5;
    width: 100%;
    min-height: 100vh;
    height: auto;
    `;    

    const containerStyle = css`
    margin: 0 auto;
    padding: 2rem;
    box-sizing: border-box;
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
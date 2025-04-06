import { Typography, styled } from '@mui/material'

export const FancyTypography = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'fancy',
})<{ fancy?: boolean }>(({ fancy }) => {
  if (fancy === false) return {}

  return {
    // backgroundImage:
    //   'linear-gradient(72.83deg, #4285f4 11.63%, #9b72cb 40.43%, #d96570 68.07%)', // gemini colors
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    // color: 'transparent',
    fontWeight: 'bold',
  }
})

import { hexToRgb, keyframes, styled } from '@mui/material'

const rgbRegex = /rgb\((\d+), (\d+), (\d+)\)/

const hexToRgba = (hex: string, alpha: number) => {
  const [r, g, b] = hexToRgb(hex).match(rgbRegex)!.slice(1, 4)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const rippleKeyFrames = (hexColor: string) => keyframes`
0% {
  box-shadow: 0 0 0 0 ${hexToRgba(hexColor, 0.3)}, 0 0 0 5px ${hexToRgba(hexColor, 0.3)}, 0 0 0 10px ${hexToRgba(hexColor, 0.3)};
}
100% {
  box-shadow: 0 0 0 5px ${hexToRgba(hexColor, 0.3)}, 0 0 0 10px ${hexToRgba(hexColor, 0.3)}, 0 0 0 20px ${hexToRgba(hexColor, 0)};
}
`

export const LoadingRipple = styled('div')(({ theme }) => {
  return {
    borderColor: theme.palette.primary.main,
    borderRadius: '50%',
    width: '100%',
    height: '100%',
    animation: `${rippleKeyFrames(theme.palette.primary.main)} 0.7s linear infinite`,
  }
})

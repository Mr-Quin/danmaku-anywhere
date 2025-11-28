import { Box, darken, lighten, styled, type Theme } from '@mui/material'

export function getScrollBarProps(theme: Theme) {
  return {
    scrollbarWidth: 'thin',
    scrollBehavior: 'smooth',
    scrollbarColor:
      theme.palette.mode === 'dark'
        ? lighten(theme.palette.background.default, 0.2) + ' transparent'
        : darken(theme.palette.background.default, 0.2) + ' transparent',
  } as const
}

export const ScrollBox = styled(Box)(({ theme }) => {
  return {
    ...getScrollBarProps(theme),
  }
})

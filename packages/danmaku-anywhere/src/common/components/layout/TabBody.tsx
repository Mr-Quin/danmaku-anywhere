import { Box, styled } from '@mui/material'

export const TabBody = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'gutters',
})<{ gutters?: number }>(({ theme, gutters = 2 }) => {
  return {
    paddingInline: theme.spacing(gutters),
  }
})

TabBody.displayName = 'TabBody'

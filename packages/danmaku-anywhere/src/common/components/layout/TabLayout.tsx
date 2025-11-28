import { Box, styled } from '@mui/material'
import { getScrollBarProps } from './ScrollBox'

export const TabLayout = styled(Box)(({ theme }) => {
  return {
    flexGrow: 1,
    position: 'relative',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    ...getScrollBarProps(theme),
  }
})

TabLayout.displayName = 'TabLayout'

import { Paper, styled } from '@mui/material'
import { getScrollBarProps } from '@/common/components/layout/ScrollBox'

export const OverlayLayout = styled(Paper)(({ theme }) => {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
    width: '100%',
    height: '100%',
    minHeight: 0,
    overflow: 'auto',
    ...getScrollBarProps(theme),
  }
})

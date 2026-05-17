import { styled, Tabs, type TabsProps } from '@mui/material'

const StyledTabs = styled(Tabs)(({ theme }) => ({
  borderRight: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  width: 76,
  flexShrink: 0,
  '& .MuiTab-root': {
    padding: theme.spacing(0.875, 0.5),
    minWidth: 0,
    fontSize: '0.6875rem',
    lineHeight: 1.2,
    textTransform: 'none',
    gap: theme.spacing(0.5),
  },
  '& .MuiTab-iconWrapper': {
    fontSize: '1.125rem',
  },
  '& .MuiButtonBase-root': {
    minHeight: 0,
  },
}))

export function SidebarTabs(props: TabsProps) {
  return (
    <StyledTabs
      orientation="vertical"
      variant="scrollable"
      scrollButtons="auto"
      {...props}
    />
  )
}

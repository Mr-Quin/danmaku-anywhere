import { styled, Tabs, type TabsProps } from '@mui/material'

const StyledTabs = styled(Tabs)(({ theme }) => ({
  borderRight: `1px solid ${theme.palette.divider}`,
  width: 100,
  flexShrink: 0,
  '& .MuiTab-root': {
    padding: theme.spacing(1),
    fontSize: 11,
    lineHeight: 1.2,
    textTransform: 'none',
    gap: theme.spacing(0.25),
  },
  '& .MuiTab-iconWrapper': {
    fontSize: 18,
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

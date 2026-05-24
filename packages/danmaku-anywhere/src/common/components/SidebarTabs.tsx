import { styled, Tabs, type TabsProps } from '@mui/material'

const StyledTabs = styled(Tabs)(({ theme }) => ({
  borderRight: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  width: 76,
  flexShrink: 0,
  padding: theme.spacing(0.5),
  '& .MuiTabs-indicator': {
    display: 'none',
  },
  '& .MuiTabs-flexContainer': {
    gap: theme.spacing(0.25),
  },
  '& .MuiTab-root': {
    padding: theme.spacing(0.875, 0.5),
    minWidth: 0,
    minHeight: 0,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: 500,
    lineHeight: 1.2,
    textTransform: 'none',
    gap: theme.spacing(0.375),
    color: theme.palette.text.secondary,
    borderRadius: theme.shape.borderRadius,
    transition: theme.transitions.create(['background-color', 'color'], {
      duration: theme.transitions.duration.shortest,
    }),
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    '&.Mui-selected': {
      backgroundColor: theme.palette.primary.light,
      color: theme.palette.primary.main,
      fontWeight: 700,
    },
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

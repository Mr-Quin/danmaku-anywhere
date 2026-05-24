import { Box, ButtonBase, Tooltip, Typography } from '@mui/material'
import type { ReactElement, ReactNode } from 'react'

export interface SegmentedTabsItem {
  value: string
  label: ReactNode
  icon?: ReactElement
  tooltip?: ReactNode
}

interface SegmentedTabsProps {
  value: string
  items: SegmentedTabsItem[]
  onChange: (value: string) => void
  color?: 'primary' | 'secondary'
  'aria-label'?: string
}

export function SegmentedTabs({
  value,
  items,
  onChange,
  color = 'primary',
  'aria-label': ariaLabel,
}: SegmentedTabsProps) {
  const activeBg = `${color}.main`
  const activeFg = `${color}.contrastText`
  return (
    <Box
      role="tablist"
      aria-label={ariaLabel}
      sx={(theme) => ({
        display: 'flex',
        gap: 0.5,
        p: 0.25,
        borderRadius: 1,
        bgcolor: theme.palette.paperAlt,
        border: `1px solid ${theme.palette.divider}`,
      })}
    >
      {items.map((item) => {
        const isActive = item.value === value
        const button = (
          <ButtonBase
            key={item.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.value)}
            sx={(theme) => ({
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              minHeight: 24,
              paddingInline: 1,
              borderRadius: 1,
              bgcolor: isActive ? activeBg : 'transparent',
              color: isActive ? activeFg : 'text.secondary',
              fontWeight: 600,
              transition: theme.transitions.create(
                ['background-color', 'color'],
                { duration: theme.transitions.duration.shortest }
              ),
              '&:hover': {
                bgcolor: isActive ? activeBg : 'action.hover',
              },
              '&.Mui-focusVisible': {
                outline: `2px solid ${theme.palette[color].main}`,
                outlineOffset: -2,
              },
            })}
          >
            {item.icon}
            <Typography
              variant="caption"
              color="inherit"
              sx={{ fontWeight: 'inherit', lineHeight: 1 }}
            >
              {item.label}
            </Typography>
          </ButtonBase>
        )

        if (item.tooltip !== undefined) {
          return (
            <Tooltip key={item.value} title={item.tooltip}>
              {button}
            </Tooltip>
          )
        }
        return button
      })}
    </Box>
  )
}

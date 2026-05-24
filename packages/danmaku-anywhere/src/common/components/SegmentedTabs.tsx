import { Box, ButtonBase, Typography } from '@mui/material'
import type { ReactElement, ReactNode } from 'react'

export interface SegmentedTabsItem {
  value: string
  label: ReactNode
  icon?: ReactElement
  badge?: ReactNode
}

interface SegmentedTabsProps {
  value: string
  items: SegmentedTabsItem[]
  onChange: (value: string) => void
  'aria-label'?: string
}

export function SegmentedTabs({
  value,
  items,
  onChange,
  'aria-label': ariaLabel,
}: SegmentedTabsProps) {
  return (
    <Box
      role="tablist"
      aria-label={ariaLabel}
      sx={(theme) => ({
        display: 'flex',
        gap: 1,
        p: 0.5,
        borderRadius: 0.5,
        bgcolor: theme.palette.paperAlt,
        border: `1px solid ${theme.palette.divider}`,
      })}
    >
      {items.map((item) => {
        const isActive = item.value === value
        return (
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
              borderRadius: 0.5,
              bgcolor: isActive ? 'primary.main' : 'transparent',
              color: isActive ? 'primary.contrastText' : 'text.secondary',
              fontWeight: 600,
              transition: theme.transitions.create(
                ['background-color', 'color'],
                { duration: theme.transitions.duration.shortest }
              ),
              '&:hover': {
                bgcolor: isActive ? 'primary.main' : 'action.hover',
              },
              '&.Mui-focusVisible': {
                outline: `2px solid ${theme.palette.primary.main}`,
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
              {item.badge !== undefined && ` · ${item.badge}`}
            </Typography>
          </ButtonBase>
        )
      })}
    </Box>
  )
}

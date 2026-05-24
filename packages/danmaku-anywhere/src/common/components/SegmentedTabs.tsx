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
        gap: 0.5,
        p: 0.5,
        borderRadius: '999px',
        bgcolor: theme.palette.paperAlt,
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              minHeight: 30,
              paddingInline: 1.25,
              borderRadius: '999px',
              bgcolor: isActive ? 'primary.main' : 'transparent',
              color: isActive ? 'primary.contrastText' : 'text.primary',
              fontWeight: isActive ? 700 : 500,
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
              variant="body2"
              color="inherit"
              sx={{ fontWeight: 'inherit' }}
            >
              {item.label}
              {item.badge !== undefined && (
                <Box component="span" sx={{ opacity: 0.7, ml: 0.5 }}>
                  · {item.badge}
                </Box>
              )}
            </Typography>
          </ButtonBase>
        )
      })}
    </Box>
  )
}

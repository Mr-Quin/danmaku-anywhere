import { Button, Collapse, Paper, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface SelectionBottomBarProps {
  open: boolean
  selectionCount: number
  onCancel: () => void
  children: ReactNode
}

export const SelectionBottomBar = ({
  open,
  selectionCount,
  onCancel,
  children,
}: SelectionBottomBarProps) => {
  const { t } = useTranslation()

  return (
    <Collapse in={open} sx={{ flexShrink: 0 }}>
      <Paper
        elevation={3}
        sx={{
          p: 1,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Stack direction="row" alignItems="center" gap={1}>
            <Button onClick={onCancel} size="small" sx={{ minWidth: 0, px: 1 }}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Typography variant="caption" color="text.secondary" lineHeight={1}>
              {t('mountPage.selectedCount', '{{count}} selected', {
                count: selectionCount,
              })}
            </Typography>
          </Stack>
          <Stack direction="row" gap={1}>
            {children}
          </Stack>
        </Stack>
      </Paper>
    </Collapse>
  )
}

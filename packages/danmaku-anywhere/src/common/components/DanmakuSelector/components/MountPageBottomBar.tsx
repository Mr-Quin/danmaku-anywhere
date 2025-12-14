import { Delete, Download, PlayArrow } from '@mui/icons-material'
import { Button, Collapse, Paper, Stack, Typography } from '@mui/material'
import { type ReactElement, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { DAMenuItemConfig } from '../../Menu/DAMenuItemConfig'
import { DrilldownMenu } from '../../Menu/DrilldownMenu'

interface MountPageBottomBarProps {
  open: boolean
  selectionCount: number
  isMounting: boolean
  onCancel: () => void
  onMount: () => void
  onExport: () => void
  onExportBackup: () => void
  onDelete: () => void
}

export const MountPageBottomBar = ({
  open,
  selectionCount,
  isMounting,
  onCancel,
  onMount,
  onExport,
  onExportBackup,
  onDelete,
}: MountPageBottomBarProps): ReactElement => {
  const { t } = useTranslation()

  const exportItems = useMemo((): DAMenuItemConfig[] => {
    const items: DAMenuItemConfig[] = []
    items.push({
      id: 'exportXml',
      label: t('danmaku.exportXml', 'Export XML'),
      onClick: () => {
        onExport()
      },
      icon: <Download fontSize="small" />,
      kind: 'item',
    })
    items.push({
      id: 'exportBackup',
      label: t('danmaku.exportBackup', 'Export Backup'),
      onClick: () => {
        onExportBackup()
      },
      icon: <Download fontSize="small" />,
      kind: 'item',
    })
    return items
  }, [onExport, onExportBackup, t])

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
            <Button
              variant="contained"
              onClick={onMount}
              startIcon={<PlayArrow />}
              size="small"
              disabled={selectionCount === 0 || isMounting}
            >
              {t('danmaku.mountShort', 'Mount')}
            </Button>
            {exportItems.length > 0 && (
              <DrilldownMenu
                items={exportItems}
                dense
                renderButton={(props) => (
                  <Button
                    variant="contained"
                    startIcon={<Download />}
                    onClick={props.onClick}
                    size="small"
                    disabled={selectionCount === 0}
                  >
                    {t('common.export', 'Export')}
                  </Button>
                )}
              />
            )}
            {onDelete && (
              <Button
                variant="contained"
                color="error"
                startIcon={<Delete />}
                onClick={onDelete}
                size="small"
                disabled={selectionCount === 0}
              >
                {t('common.delete', 'Delete')}
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>
    </Collapse>
  )
}

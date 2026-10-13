import { Delete, Download, PlayArrow } from '@mui/icons-material'
import {
  Button,
  type ButtonProps,
  Collapse,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { type ReactElement, type ReactNode, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { NARROW_CONTAINER_QUERY } from '@/common/components/layout/narrowContainer'
import type { DAMenuItemConfig } from '../../Menu/DAMenuItemConfig'
import { DrilldownMenu } from '../../Menu/DrilldownMenu'

type BarActionProps = Omit<ButtonProps, 'children' | 'startIcon'> & {
  icon: ReactNode
  label: string
}

// Collapses to its icon in a narrow bar so labels never wrap.
function BarAction({ icon, label, sx, ...props }: BarActionProps) {
  return (
    <Tooltip title={label}>
      <span>
        <Button
          variant="contained"
          size="small"
          startIcon={icon}
          aria-label={label}
          {...props}
          sx={[
            {
              whiteSpace: 'nowrap',
              [NARROW_CONTAINER_QUERY]: {
                minWidth: 0,
                px: 1,
                '& .MuiButton-startIcon': { mx: 0 },
                '& .bar-action-label': { display: 'none' },
              },
            },
            ...(Array.isArray(sx) ? sx : [sx]),
          ]}
        >
          <span className="bar-action-label">{label}</span>
        </Button>
      </span>
    </Tooltip>
  )
}

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
          containerType: 'inline-size',
        }}
      >
        <Stack
          direction="row"
          sx={{
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Stack
            direction="row"
            sx={{
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Button
              onClick={onCancel}
              size="small"
              sx={{ minWidth: 0, px: 1, whiteSpace: 'nowrap' }}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {t('mountPage.selectedCount', '{{count}} selected', {
                count: selectionCount,
              })}
            </Typography>
          </Stack>
          <Stack
            direction="row"
            sx={{
              gap: 1,
            }}
          >
            <BarAction
              onClick={onMount}
              icon={<PlayArrow />}
              label={t('danmaku.mountShort', 'Mount')}
              disabled={selectionCount === 0 || isMounting}
            />
            {exportItems.length > 0 && (
              <DrilldownMenu
                items={exportItems}
                dense
                renderButton={(props) => (
                  <BarAction
                    id={props.id}
                    onClick={props.onClick}
                    icon={<Download />}
                    label={t('common.export', 'Export')}
                    disabled={selectionCount === 0}
                  />
                )}
              />
            )}
            {onDelete && (
              <BarAction
                color="error"
                icon={<Delete />}
                label={t('common.delete', 'Delete')}
                onClick={onDelete}
                disabled={selectionCount === 0}
                data-testid="mount-bulk-delete"
              />
            )}
          </Stack>
        </Stack>
      </Paper>
    </Collapse>
  )
}

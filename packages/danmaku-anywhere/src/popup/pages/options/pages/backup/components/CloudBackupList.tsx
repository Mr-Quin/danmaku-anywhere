import {
  Button,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { CloudBackupItem } from '@/common/backup/dto'
import { useDialog } from '@/common/components/Dialog/dialogStore'

export function useTimeAgo(date: Date | string | number) {
  const { i18n } = useTranslation()
  const rtf = new Intl.RelativeTimeFormat(i18n.language || 'en', {
    numeric: 'auto',
  })
  const diffInSeconds = (new Date(date).getTime() - Date.now()) / 1000
  if (Math.abs(diffInSeconds) < 60)
    return rtf.format(Math.round(diffInSeconds), 'second')
  const diffInMinutes = diffInSeconds / 60
  if (Math.abs(diffInMinutes) < 60)
    return rtf.format(Math.round(diffInMinutes), 'minute')
  const diffInHours = diffInMinutes / 60
  if (Math.abs(diffInHours) < 24)
    return rtf.format(Math.round(diffInHours), 'hour')
  const diffInDays = diffInHours / 24
  if (Math.abs(diffInDays) < 30)
    return rtf.format(Math.round(diffInDays), 'day')
  const diffInMonths = diffInDays / 30
  if (Math.abs(diffInMonths) < 12)
    return rtf.format(Math.round(diffInMonths), 'month')
  const diffInYears = diffInDays / 365
  return rtf.format(Math.round(diffInYears), 'year')
}

export function CloudBackupList({
  backups,
  isRestoring,
  restoringId,
  onRestore,
}: {
  backups: CloudBackupItem[]
  isRestoring: boolean
  restoringId: string | undefined
  onRestore: (id: string) => void
}) {
  const { t } = useTranslation()
  const dialog = useDialog()

  const handleRestore = (id: string) => {
    dialog.confirm({
      title: t('optionsPage.backup.restoreConfirmTitle', 'Restore Settings?'),
      content: t(
        'optionsPage.backup.restoreConfirmDesc',
        'Restoring this backup will overwrite your current settings. Are you sure you want to proceed?'
      ),
      confirmText: t('common.restore', 'Restore'),
      onConfirm: () => onRestore(id),
    })
  }

  return (
    <List disablePadding>
      {backups.map((backup, index) => (
        <CloudBackupListItem
          key={backup.id}
          backup={backup}
          index={index}
          isRestoring={isRestoring}
          restoringId={restoringId}
          onRestore={() => handleRestore(backup.id)}
        />
      ))}
    </List>
  )
}

function CloudBackupListItem({
  backup,
  index,
  isRestoring,
  restoringId,
  onRestore,
}: {
  backup: CloudBackupItem
  index: number
  isRestoring: boolean
  restoringId: string | undefined
  onRestore: () => void
}) {
  const { t, i18n } = useTranslation()
  const timeAgo = useTimeAgo(backup.createdAt)

  return (
    <ListItem
      disablePadding
      sx={{ mb: 1.5 }}
      secondaryAction={
        <Button size="small" disabled={isRestoring} onClick={onRestore}>
          {isRestoring && restoringId === backup.id ? (
            <CircularProgress size={18} />
          ) : (
            t('common.restore', 'Restore')
          )}
        </Button>
      }
    >
      <ListItemText
        primary={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>
              {new Date(backup.createdAt).toLocaleString(i18n.language)}
            </span>
            {backup.extensionVersion && (
              <Chip
                label={`v${backup.extensionVersion}`}
                size="small"
                variant="outlined"
              />
            )}
            {index === 0 && (
              <Chip
                label={t('optionsPage.backup.latestRevision', 'Latest')}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </div>
        }
        secondary={timeAgo}
      />
    </ListItem>
  )
}

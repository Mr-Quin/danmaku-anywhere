import {
  Alert,
  Box,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import { useMutation } from '@tanstack/react-query'
import { type ChangeEvent, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { BackupData, BackupRestoreResult } from '@/common/backup/dto'
import { backgroundClient } from '@/common/rpcClient/background/client'

const HiddenInput = styled('input')({
  display: 'none',
})

export function BackupPage() {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const exportMutation = useMutation({
    mutationFn: async () => {
      return await backgroundClient.backupExport()
    },
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `danmaku-anywhere-backup-${new Date().toISOString()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
  })

  const importMutation = useMutation({
    mutationFn: async (data: BackupData) => {
      return await backgroundClient.backupImport(data)
    },
  })

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content) as BackupData
        importMutation.mutate(data)
      } catch (error) {
        console.error('Failed to parse backup file', error)
      }
    }
    reader.readAsText(file) // fixed: use readAsText

    // Clear input so same file can be selected again
    event.target.value = ''
  }

  const renderImportResult = (result: BackupRestoreResult) => {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity={result.success ? 'success' : 'warning'}>
          {result.success
            ? t('Backup imported successfully')
            : t('Backup imported with warnings')}
        </Alert>
        <List dense>
          {Object.entries(result.details).map(([key, detail]) => (
            <ListItem key={key}>
              <ListItemText
                primary={t(key)}
                secondary={
                  detail?.success
                    ? t('Success')
                    : `${t('Failed')}: ${detail?.error}`
                }
                secondaryTypographyProps={{
                  color: detail?.success ? 'success.main' : 'error.main',
                }}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        {t('Backup & Restore')}
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          {t('Export')}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {t('Export all settings to a JSON file.')}
        </Typography>
        <Button
          variant="contained"
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
        >
          {exportMutation.isPending ? (
            <CircularProgress size={24} />
          ) : (
            t('Export Backup')
          )}
        </Button>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {t('Import')}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {t('Restore settings from a JSON file.')}
        </Typography>
        <Button
          variant="outlined"
          onClick={handleImportClick}
          disabled={importMutation.isPending}
        >
          {importMutation.isPending ? (
            <CircularProgress size={24} />
          ) : (
            t('Import Backup')
          )}
        </Button>
        <HiddenInput
          type="file"
          ref={fileInputRef}
          accept=".json"
          onChange={handleFileChange}
        />

        {importMutation.isSuccess && renderImportResult(importMutation.data)}
        {importMutation.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {t('Import failed')}: {importMutation.error.message}
          </Alert>
        )}
      </Paper>
    </Box>
  )
}

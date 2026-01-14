import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import { useMutation } from '@tanstack/react-query'
import { type ChangeEvent, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { createDownload } from '@/common/utils/utils'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'

const HiddenInput = styled('input')({
  display: 'none',
})

export function BackupPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const exportMutation = useMutation({
    mutationFn: async () => {
      return await chromeRpcClient.backupExport()
    },
    onSuccess: ({ data }) => {
      void createDownload(
        new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json',
        }),
        `danmaku-anywhere-backup-${new Date().toISOString()}.json`
      ).then(() => {
        toast.success(
          t(
            'optionsPage.backup.alert.exportSuccess',
            'Backup exported successfully'
          )
        )
      })
    },
  })

  const importMutation = useMutation({
    mutationFn: async (data) => {
      return await chromeRpcClient.backupImport(data)
    },
    onSuccess: () => {
      toast.success(
        t(
          'optionsPage.backup.alert.importSuccess',
          'Backup imported successfully'
        )
      )
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
        const data = JSON.parse(content)
        importMutation.mutate(data)
      } catch (error) {
        console.error('Failed to parse backup file', error)
      }
    }
    reader.readAsText(file)

    event.target.value = ''
  }

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar
        title={t('optionsPage.pages.backup', 'Backup & Restore')}
      />
      <Box sx={{ p: 2 }}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            {t('common.export', 'Export')}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {t(
              'optionsPage.backup.exportDescription',
              'Export all settings to a JSON file.'
            )}
          </Typography>
          <Button
            variant="contained"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
          >
            {exportMutation.isPending ? (
              <CircularProgress size={24} />
            ) : (
              t('optionsPage.backup.export', 'Export Backup')
            )}
          </Button>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {t('common.import', 'Import')}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {t(
              'optionsPage.backup.importDescription',
              'Restore settings from a JSON file.'
            )}
          </Typography>
          <Button
            variant="outlined"
            onClick={handleImportClick}
            disabled={importMutation.isPending}
          >
            {importMutation.isPending ? (
              <CircularProgress size={24} />
            ) : (
              t('optionsPage.backup.import', 'Import Backup')
            )}
          </Button>
          <HiddenInput
            type="file"
            ref={fileInputRef}
            accept=".json"
            onChange={handleFileChange}
          />
          {importMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {t('optionsPage.backup.importError', 'Import failed')}:
              {importMutation.error.message}
            </Alert>
          )}
        </Paper>
      </Box>
    </OptionsPageLayout>
  )
}

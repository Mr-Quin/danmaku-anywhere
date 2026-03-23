import { Button, CircularProgress, Stack } from '@mui/material'
import { styled } from '@mui/material/styles'
import { useMutation } from '@tanstack/react-query'
import { type ChangeEvent, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { createDownload } from '@/common/utils/utils'
import { SectionHeader } from './SectionHeader'

const HiddenInput = styled('input')({
  display: 'none',
})

export function LocalBackupSection({
  isRestoringExt,
}: {
  isRestoringExt?: boolean
}) {
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
    mutationFn: async (data: unknown) => {
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
    onError: (error) => {
      toast.error(
        t('optionsPage.backup.importError', 'Import failed') +
          `: ${error.message}`
      )
    },
  })

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      importMutation.mutate(content)
    }
    reader.readAsText(file)

    event.target.value = ''
  }

  const isRestoring = importMutation.isPending || isRestoringExt

  return (
    <div>
      <SectionHeader
        title={t('optionsPage.backup.localBackup', 'Local Backup')}
        description={t(
          'optionsPage.backup.localDescription',
          'Save and restore your settings as a JSON file.'
        )}
      />
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="contained"
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
        >
          {exportMutation.isPending ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            t('optionsPage.backup.exportToFile', 'Save to File')
          )}
        </Button>
        <Button
          variant="outlined"
          onClick={handleImportClick}
          disabled={isRestoring}
        >
          {importMutation.isPending ? (
            <CircularProgress size={20} />
          ) : (
            t('optionsPage.backup.importFromFile', 'Restore from File')
          )}
        </Button>
      </Stack>

      <HiddenInput
        type="file"
        ref={fileInputRef}
        accept=".json"
        onChange={handleFileChange}
      />
    </div>
  )
}

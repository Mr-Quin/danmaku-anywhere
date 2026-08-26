import { Download, Upload } from '@mui/icons-material'
import { Button, CircularProgress } from '@mui/material'
import { styled } from '@mui/material/styles'
import { useMutation } from '@tanstack/react-query'
import { type ChangeEvent, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { getTrackingService } from '@/common/telemetry/getTrackingService'
import { createDownload } from '@/common/utils/utils'
import {
  SettingsGroup,
  SettingsGroupLabel,
  SettingsStaticRow,
} from '@/popup/pages/options/components/settings/SettingsGroup'
import { useBackupImport } from '../useBackupImport'

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
        getTrackingService().track('backupExport', {})
      })
    },
  })

  const importMutation = useBackupImport()

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
    <>
      <SettingsGroupLabel>
        {t('optionsPage.backup.localBackup', 'Local Backup')}
      </SettingsGroupLabel>
      <SettingsGroup>
        <SettingsStaticRow
          icon={<Download fontSize="small" />}
          title={t('optionsPage.backup.exportToFile', 'Save to File')}
          subtitle={t(
            'optionsPage.backup.exportRowDesc',
            'Save settings to a JSON file'
          )}
          right={
            <Button
              variant="soft"
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
              startIcon={
                exportMutation.isPending ? (
                  <CircularProgress size={14} />
                ) : undefined
              }
            >
              {t('optionsPage.backup.export', 'Export')}
            </Button>
          }
        />
        <SettingsStaticRow
          icon={<Upload fontSize="small" />}
          iconTone="secondary"
          title={t('optionsPage.backup.importFromFile', 'Restore from File')}
          subtitle={t(
            'optionsPage.backup.importRowDesc',
            'Restore settings from a JSON file'
          )}
          right={
            <Button
              variant="soft"
              color="secondary"
              onClick={handleImportClick}
              disabled={isRestoring}
              startIcon={
                importMutation.isPending ? (
                  <CircularProgress size={14} />
                ) : undefined
              }
            >
              {t('optionsPage.backup.import', 'Import')}
            </Button>
          }
        />
      </SettingsGroup>

      <HiddenInput
        type="file"
        ref={fileInputRef}
        accept=".json"
        onChange={handleFileChange}
        data-testid="backup-restore-input"
      />
    </>
  )
}

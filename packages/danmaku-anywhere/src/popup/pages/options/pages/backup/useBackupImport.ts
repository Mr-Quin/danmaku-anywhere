import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { getTrackingService } from '@/common/telemetry/getTrackingService'

export function useBackupImport(options?: { onSettled?: () => void }) {
  const { t } = useTranslation()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: unknown) => chromeRpcClient.backupImport(data),
    onSuccess: () => {
      toast.success(
        t(
          'optionsPage.backup.alert.importSuccess',
          'Backup imported successfully'
        )
      )
      getTrackingService().track('backupImport', {})
    },
    onError: (error) => {
      toast.error(
        t('optionsPage.backup.importError', 'Import failed') +
          `: ${error.message}`
      )
    },
    onSettled: options?.onSettled,
  })
}

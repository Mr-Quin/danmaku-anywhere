import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export function useBackupImport(options?: { onSettled?: () => void }) {
  const { t } = useTranslation()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: unknown) => chromeRpcClient.backupImport(data),
    onSuccess: ({ data: result }) => {
      if (result.success) {
        toast.success(
          t(
            'optionsPage.backup.alert.importSuccess',
            'Backup imported successfully'
          )
        )
        return
      }

      const problems = Object.entries(result.details).filter(([, detail]) => {
        return !detail.success || (detail.droppedEntries ?? 0) > 0
      })

      toast.error(
        t(
          'optionsPage.backup.alert.importPartial',
          'Some settings could not be restored: {{stores}}',
          { stores: problems.map(([name]) => name).join(', ') }
        )
      )
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

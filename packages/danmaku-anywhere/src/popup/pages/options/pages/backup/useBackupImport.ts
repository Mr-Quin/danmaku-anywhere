import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import {
  describeBackupImportError,
  describeRestoreProblems,
} from './backupImportMessages'

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

      toast.error(
        t(
          'optionsPage.backup.alert.importPartial',
          'Some settings could not be restored: {{stores}}',
          { stores: describeRestoreProblems(result) }
        )
      )
    },
    onError: (error) => {
      toast.error(describeBackupImportError(error))
    },
    onSettled: options?.onSettled,
  })
}

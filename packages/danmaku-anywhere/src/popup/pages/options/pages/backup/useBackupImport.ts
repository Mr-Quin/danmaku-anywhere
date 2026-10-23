import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { describeError } from '@/common/errors/describeError'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import {
  describeMissingStores,
  describeRestoreProblems,
} from './backupImportMessages'

export function useBackupImport(options?: { onSettled?: () => void }) {
  const { t } = useTranslation()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: unknown) => chromeRpcClient.backupImport(data),
    onSuccess: ({ data: result }) => {
      if (result.success && (result.missing ?? []).length > 0) {
        toast.warn(
          t(
            'optionsPage.backup.alert.importMissing',
            'Backup imported. It had no {{stores}}, so those were left as they were.',
            { stores: describeMissingStores(result) }
          )
        )
        return
      }
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
      toast.error(describeError(error).message)
    },
    onSettled: options?.onSettled,
  })
}

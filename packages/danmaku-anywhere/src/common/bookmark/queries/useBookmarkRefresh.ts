import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { bookmarkQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

interface UseBookmarkRefreshOptions {
  silent?: boolean
}

export const useBookmarkRefresh = (options: UseBookmarkRefreshOptions = {}) => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  return useMutation({
    mutationKey: bookmarkQueryKeys.all(),
    mutationFn: (id: number) => chromeRpcClient.bookmarkRefresh({ id }),
    onSuccess: () => {
      if (!options.silent) {
        toast.success(t('common.success', 'Success'))
      }
    },
    onError: () => {
      if (!options.silent) {
        toast.error(t('common.failed', 'Failed'))
      }
    },
  })
}

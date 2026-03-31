import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { bookmarkQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useBookmarkDelete = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  return useMutation({
    mutationKey: bookmarkQueryKeys.all(),
    mutationFn: (id: number) => chromeRpcClient.bookmarkDelete({ id }),
    onSuccess: () => {
      toast.success(t('common.success', 'Success'))
    },
    onError: () => {
      toast.error(t('common.failed', 'Failed'))
    },
  })
}

export const useBookmarkDeleteBySeason = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  return useMutation({
    mutationKey: bookmarkQueryKeys.all(),
    mutationFn: (seasonId: number) =>
      chromeRpcClient.bookmarkDeleteBySeason({ seasonId }),
    onSuccess: () => {
      toast.success(t('common.success', 'Success'))
    },
    onError: () => {
      toast.error(t('common.failed', 'Failed'))
    },
  })
}

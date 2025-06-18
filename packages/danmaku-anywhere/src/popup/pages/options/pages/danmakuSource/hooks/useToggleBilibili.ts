import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { useDanmakuSources } from '@/common/options/extensionOptions/useDanmakuSources'
import { sourceQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useToggleBilibili = () => {
  const { toggle, enabledSources } = useDanmakuSources()
  const toast = useToast.use.toast()
  const { t } = useTranslation()

  const query = useQuery({
    queryFn: () => chromeRpcClient.bilibiliGetLoginStatus(),
    select: (res) => res.data,
    queryKey: sourceQueryKeys.bilibili(),
    enabled: enabledSources.some((s) => s.key === 'bilibili'),
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  const mutation = useMutation({
    mutationFn: async (checked: boolean) => {
      if (!checked) return toggle('bilibili', false)

      await chromeRpcClient.bilibiliSetCookies()
      await toggle('bilibili', true)
    },
    onSuccess: (_, v) => {
      if (v) {
        // only refetch when enabling
        void query.refetch()
      }
    },
    onError: () => {
      toast.error(t('danmakuSource.error.bilibiliAccess'))
    },
  })

  return {
    toggle: mutation.mutate,
    isLoading: query.isLoading || mutation.isPending,
    loginStatus: query.data,
  }
}

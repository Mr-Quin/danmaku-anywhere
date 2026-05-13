import type { SeasonInsert } from '@danmaku-anywhere/danmaku-converter'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export function useUpsertSeason() {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  return useMutation({
    mutationFn: async (insert: SeasonInsert) => {
      const res = await chromeRpcClient.seasonUpsert(insert)
      return res.data
    },
    meta: {
      invalidates: [seasonQueryKeys.all()],
    },
    onError: (error) => {
      toast.error(error.message || t('common.failed', 'Failed'))
    },
  })
}

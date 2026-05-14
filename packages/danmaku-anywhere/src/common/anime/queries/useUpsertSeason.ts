import type {
  CustomSeason,
  Season,
  SeasonInsert,
} from '@danmaku-anywhere/danmaku-converter'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { isProvider } from '@/common/danmaku/utils'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

type SeasonOrInsert = Season | SeasonInsert | CustomSeason

export function useUpsertSeason() {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  return useMutation({
    mutationFn: async (
      input: SeasonOrInsert
    ): Promise<Season | CustomSeason> => {
      // Custom seasons live in customEpisode, not the seasons table.
      if (isProvider(input, DanmakuSourceType.MacCMS)) {
        return input
      }
      const res = await chromeRpcClient.seasonUpsert(input)
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

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import type {
  CustomEpisodeQueryFilter,
  EpisodeQueryFilter,
} from '@/common/danmaku/dto'
import {
  customEpisodeQueryKeys,
  episodeQueryKeys,
  seasonQueryKeys,
} from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export type DeleteDanmakuData =
  | {
      isCustom: false
      filter: EpisodeQueryFilter
    }
  | {
      isCustom: true
      filter: CustomEpisodeQueryFilter
    }

export const useDeleteEpisode = () => {
  const { t } = useTranslation()

  const toast = useToast.use.toast()

  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: DeleteDanmakuData) => {
      if (!data.isCustom) {
        await chromeRpcClient.episodeDelete(data.filter)
      } else {
        await chromeRpcClient.episodeDeleteCustom(data.filter)
      }
    },
    onError: (e) => {
      toast.error(
        t(
          'danmaku.alert.deleteError',
          'Failed to delete danmaku: {{message}}',
          {
            message: e.message,
          }
        )
      )
    },
    onSuccess: (_, input) => {
      toast.success(t('danmaku.alert.deleted', 'Danmaku Deleted'))
      void queryClient.invalidateQueries({
        queryKey: seasonQueryKeys.all(),
      })
      void queryClient.invalidateQueries({
        queryKey: !input.isCustom
          ? episodeQueryKeys.all()
          : customEpisodeQueryKeys.all(),
      })
    },
  })
}

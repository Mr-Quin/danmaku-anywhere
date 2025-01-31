import { useEventCallback } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import {
  danmakuToString,
  getNextEpisodeMeta,
  isDanmakuProvider,
} from '@/common/danmaku/utils'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { useStore } from '@/content/controller/store/store'

// Helper to quickly get the next episode without having to go back to the search page
// Only available when integration is None and in manual mode
export const useLoadDanmakuNextEpisode = () => {
  const { t } = useTranslation()
  const { danmakuLite, isManual } = useStore.use.danmaku()
  const toast = useToast.use.toast()

  const { loadMutation } = useLoadDanmaku()

  const canFetchNextEpisode =
    !!danmakuLite &&
    isDanmakuProvider(danmakuLite, DanmakuSourceType.DanDanPlay) &&
    isManual

  const fetchNextEpisodeComments = useEventCallback(async () => {
    if (!canFetchNextEpisode) return

    const nextMeta = getNextEpisodeMeta(danmakuLite.meta)

    toast.info(t('danmaku.alert.fetchingNext'))

    loadMutation.mutate(
      { meta: nextMeta },
      {
        onSuccess: (result) => {
          toast.success(
            t('danmaku.alert.mounted', {
              name: danmakuToString(result),
              count: result.commentCount,
            })
          )
        },
        onError: () => {
          toast.error(t('danmaku.error.nextEpisodeNotFound'))
        },
      }
    )
  })

  return {
    fetchNextEpisodeComments,
    isFetchingNextEpisode: loadMutation.isPending,
    canFetchNextEpisode,
  }
}

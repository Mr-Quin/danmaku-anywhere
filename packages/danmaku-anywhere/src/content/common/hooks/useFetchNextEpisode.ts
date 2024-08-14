import { useEventCallback } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useStore } from '../../store/store'

import { useToast } from '@/common/components/Toast/toastStore'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import {
  danmakuToString,
  getNextEpisodeMeta,
  isDanmakuType,
} from '@/common/danmaku/utils'
import { useFetchDanmakuMapped } from '@/content/common/hooks/useFetchDanmakuMapped'

// Helper to quickly get the next episode without having to go back to the search page
// Only available when integration is None and in manual mode
export const useFetchNextEpisode = () => {
  const { t } = useTranslation()
  const danmakuLite = useStore((state) => state.danmakuLite)
  const manual = useStore.use.manual()
  const toast = useToast.use.toast()

  const { mutate, isPending } = useFetchDanmakuMapped({
    onMutate: () => {
      toast.info(t('danmaku.alert.fetchingNext'))
    },
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
  })

  const canFetchNextEpisode =
    !!danmakuLite && isDanmakuType(danmakuLite, DanmakuSourceType.DDP) && manual

  const fetchNextEpisodeComments = useEventCallback(async () => {
    if (!canFetchNextEpisode) return

    const nextMeta = getNextEpisodeMeta(danmakuLite.meta)

    mutate({ danmakuMeta: nextMeta })
  })

  return {
    fetchNextEpisodeComments,
    isFetchingNextEpisode: isPending,
    canFetchNextEpisode,
  }
}

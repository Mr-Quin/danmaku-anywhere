import { useEventCallback } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useStore } from '../../store/store'

import { useToast } from '@/common/components/Toast/toastStore'
import {
  danmakuMetaToString,
  getNextEpisodeMeta,
  isCustomDanmaku,
} from '@/common/danmaku/utils'
import { useFetchDanmakuMapped } from '@/content/common/hooks/useFetchDanmakuMapped'

// Helper to quickly get the next episode without having to go back to the search page
// Only available when integration is None and in manual mode
export const useFetchNextEpisode = () => {
  const { t } = useTranslation()
  const danmakuMeta = useStore((state) => state.danmakuMeta)
  const manual = useStore.use.manual()
  const toast = useToast.use.toast()

  const { mutate, isPending } = useFetchDanmakuMapped({
    onMutate: () => {
      toast.info(t('danmaku.alert.fetchingNext'))
    },
    onSuccess: (result) => {
      toast.success(
        t('danmaku.alert.mounted', {
          name: danmakuMetaToString(result.meta),
          count: result.count,
        })
      )
    },
    onError: () => {
      toast.error(t('danmaku.error.nextEpisodeNotFound'))
    },
  })

  const canFetchNextEpisode =
    !!danmakuMeta && !isCustomDanmaku(danmakuMeta) && manual

  const fetchNextEpisodeComments = useEventCallback(async () => {
    if (!canFetchNextEpisode) return

    const nextMeta = getNextEpisodeMeta(danmakuMeta)

    mutate({ danmakuMeta: nextMeta })
  })

  return {
    fetchNextEpisodeComments,
    isFetchingNextEpisode: isPending,
    canFetchNextEpisode,
  }
}

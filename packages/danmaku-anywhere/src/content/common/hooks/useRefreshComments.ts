import { useEventCallback } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useStore } from '../../store/store'

import { useToast } from '@/common/components/Toast/toastStore'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { isDanmakuProvider } from '@/common/danmaku/utils'
import { useFetchDanmakuMapped } from '@/content/common/hooks/useFetchDanmakuMapped'

export const useRefreshComments = () => {
  const { t } = useTranslation()
  const danmakuLite = useStore((state) => state.danmakuLite)
  const getAnimeName = useStore((state) => state.getAnimeName)
  const toast = useToast.use.toast()

  const { mutate, isPending } = useFetchDanmakuMapped({
    onMutate: () => {
      toast.info(t('danmaku.alert.refreshingDanmaku'))
    },
    onSuccess: (result) => {
      toast.success(
        t('danmaku.alert.refreshed', {
          name: getAnimeName(),
          count: result.commentCount,
        })
      )
    },
  })

  const refreshComments = useEventCallback(async () => {
    if (!danmakuLite || !isDanmakuProvider(danmakuLite, DanmakuSourceType.DDP))
      return

    mutate({ danmakuMeta: danmakuLite.meta, options: { forceUpdate: true } })
  })

  return {
    refreshComments,
    isPending,
    canRefresh: !!danmakuLite,
  }
}

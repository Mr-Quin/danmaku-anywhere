import { useEventCallback } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useStore } from '../../store/store'

import { useToast } from '@/common/components/Toast/toastStore'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { isDanmakuProvider } from '@/common/danmaku/utils'
import { useLoadDanmaku } from '@/content/common/hooks/useLoadDanmaku'

export const useRefreshComments = () => {
  const { t } = useTranslation()
  const danmakuLite = useStore((state) => state.danmakuLite)
  const getAnimeName = useStore((state) => state.getAnimeName)
  const toast = useToast.use.toast()

  const { mutate, isPending } = useLoadDanmaku()

  const refreshComments = useEventCallback(async () => {
    if (!danmakuLite || !isDanmakuProvider(danmakuLite, DanmakuSourceType.DDP))
      return

    toast.info(t('danmaku.alert.refreshingDanmaku'))
    mutate(
      { danmakuMeta: danmakuLite.meta, options: { forceUpdate: true } },
      {
        onSuccess: (result) => {
          toast.success(
            t('danmaku.alert.refreshed', {
              name: getAnimeName(),
              count: result.commentCount,
            })
          )
        },
      }
    )
  })

  return {
    refreshComments,
    isPending,
    canRefresh: !!danmakuLite,
  }
}

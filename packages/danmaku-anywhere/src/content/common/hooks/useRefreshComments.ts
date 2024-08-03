import { useEventCallback } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useStore } from '../../store/store'

import { useToast } from '@/common/components/Toast/toastStore'
import { isCustomDanmaku } from '@/common/danmaku/utils'
import { useFetchDanmakuMapped } from '@/content/common/hooks/useFetchDanmakuMapped'

export const useRefreshComments = () => {
  const { t } = useTranslation()
  const danmakuMeta = useStore((state) => state.danmakuMeta)
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
          count: result.count,
        })
      )
    },
  })

  const refreshComments = useEventCallback(async () => {
    if (!danmakuMeta || isCustomDanmaku(danmakuMeta)) return

    mutate({ danmakuMeta, options: { forceUpdate: true } })
  })

  return {
    refreshComments,
    isPending,
    canRefresh: !!danmakuMeta,
  }
}

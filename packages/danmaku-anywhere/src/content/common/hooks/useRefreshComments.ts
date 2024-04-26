import { useEventCallback } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useStore } from '../../store/store'

import { useToast } from '@/common/components/toast/toastStore'
import { DanmakuType } from '@/common/types/Danmaku'
import { tryCatch } from '@/common/utils/utils'
import { useFetchDanmakuMapped } from '@/content/common/hooks/useFetchDanmakuMapped'

export const useRefreshComments = () => {
  const { t } = useTranslation()
  const danmakuMeta = useStore((state) => state.danmakuMeta)
  const getAnimeName = useStore((state) => state.getAnimeName)
  const toast = useToast.use.toast()

  const { fetch, isPending } = useFetchDanmakuMapped()

  const refreshComments = useEventCallback(async () => {
    if (!danmakuMeta || danmakuMeta.type === DanmakuType.Manual) return

    const [result, err] = await tryCatch(() =>
      fetch({ danmakuMeta, options: { forceUpdate: true } })
    )

    if (!err) {
      toast.success(
        t('danmaku.alert.refreshed', {
          name: getAnimeName(),
          count: result.count,
        })
      )
    }
  })

  return {
    refreshComments,
    isPending,
    canRefresh: !!danmakuMeta,
  }
}

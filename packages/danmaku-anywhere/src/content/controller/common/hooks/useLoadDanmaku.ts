import { useEventCallback } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import type { DanmakuFetchDto } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { Danmaku } from '@/common/danmaku/models/danmaku'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { isDanmakuProvider } from '@/common/danmaku/utils'
import { useMountDanmaku } from '@/content/controller/common/hooks/useMountDanmaku'
import { useStore } from '@/content/controller/store/store'

// Wrapper around useFetchDanmaku and useMountDanmaku
export const useLoadDanmaku = () => {
  const { t } = useTranslation()

  const toast = useToast.use.toast()

  const getAnimeName = useStore.use.getAnimeName()
  const { danmakuLite } = useStore.use.danmaku()

  const fetchMutation = useFetchDanmaku()
  const mountMutation = useMountDanmaku()

  const canRefresh =
    !!danmakuLite &&
    isDanmakuProvider(danmakuLite, DanmakuSourceType.DanDanPlay)

  const mountDanmaku = useEventCallback((danmaku: Danmaku) => {
    return mountMutation.mutateAsync(danmaku, {
      // This is called in addition to the onSuccess of mountMutation
      onSuccess: () => {
        toast.success(
          t('danmaku.alert.mounted', {
            name: getAnimeName(),
            count: danmaku.commentCount,
          }),
          {
            actionFn: isDanmakuProvider(danmaku, DanmakuSourceType.DanDanPlay)
              ? refreshComments
              : undefined,
            actionLabel: t('danmaku.refresh'),
          }
        )
      },
    })
  })

  const loadMutation = useMutation({
    mutationFn: async (data: DanmakuFetchDto) => {
      return fetchMutation.mutateAsync(data, {
        onSuccess: (cache) => {
          mountDanmaku(cache)
        },
        onError: (err) => {
          toast.error(err.message)
        },
      })
    },
  })

  const refreshComments = useEventCallback(async () => {
    if (!canRefresh) return

    toast.info(t('danmaku.alert.refreshingDanmaku'))
    loadMutation.mutate(
      { meta: danmakuLite.meta, options: { forceUpdate: true } },
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

  return { loadMutation, refreshComments, canRefresh, mountDanmaku }
}

import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import type { DanmakuFetchDto } from '@/common/danmaku/dto'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { useMountDanmaku } from '@/content/controller/common/hooks/useMountDanmaku'
import { useStore } from '@/content/controller/store/store'

// Wrapper around useFetchDanmaku and useMountDanmaku
export const useLoadDanmaku = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  const getAnimeName = useStore.use.getAnimeName()
  const danmakuLite = useStore((state) => state.danmakuLite)

  const fetchMutation = useFetchDanmaku()
  const mountMutation = useMountDanmaku()

  const loadMutation = useMutation({
    mutationFn: async (data: DanmakuFetchDto) => {
      return fetchMutation.mutateAsync(data, {
        onSuccess: (cache) => {
          mountMutation.mutate(cache, {
            // This is called in addition to the onSuccess of the mutation
            onSuccess: () => {
              toast.success(
                t('danmaku.alert.mounted', {
                  name: getAnimeName(),
                  count: cache.commentCount,
                })
                // {
                //   actionFn: canRefresh ? refreshComments : undefined,
                //   actionLabel: t('danmaku.refresh'),
                // }
              )
            },
          })
        },
        onError: (err) => {
          toast.error(err.message)
        },
      })
    },
  })

  return loadMutation
}

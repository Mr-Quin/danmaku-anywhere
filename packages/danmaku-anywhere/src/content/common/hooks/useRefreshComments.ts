import { useEventCallback } from '@mui/material'

import { useStore } from '../../store/store'

import { useToast } from '@/common/components/toast/toastStore'
import { tryCatch } from '@/common/utils/utils'
import { useFetchDanmakuMapped } from '@/content/common/hooks/useFetchDanmakuMapped'

export const useRefreshComments = () => {
  const danmakuMeta = useStore((state) => state.danmakuMeta)
  const toast = useToast.use.toast()

  const { fetch, isPending } = useFetchDanmakuMapped()

  const refreshComments = useEventCallback(async () => {
    if (!danmakuMeta) return

    const [result, err] = await tryCatch(() =>
      fetch({ danmakuMeta, options: { forceUpdate: true } })
    )

    if (!err) {
      toast.success(`Refreshed ${danmakuMeta.episodeTitle} (${result.length})`)
    }
  })

  return {
    refreshComments,
    isPending,
    canRefresh: !!danmakuMeta,
  }
}

import { useEventCallback } from '@mui/material'

import { useStore } from '../../store/store'

import { useToast } from '@/common/components/toast/toastStore'
import { tryCatch } from '@/common/utils'
import { useFetchDanmakuMutation } from '@/content/common/hooks/useFetchDanmakuMutation'

export const useRefreshComments = () => {
  const danmakuMeta = useStore((state) => state.danmakuMeta)
  const toast = useToast.use.toast()

  const { fetch, isPending } = useFetchDanmakuMutation()

  const refreshComments = useEventCallback(async () => {
    if (!danmakuMeta) return

    const [, err] = await tryCatch(() =>
      fetch({ danmakuMeta, options: { forceUpdate: true } })
    )

    if (!err) {
      toast.success('Comments refreshed')
    }
  })

  return {
    refreshComments,
    isPending,
    canRefresh: !!danmakuMeta,
  }
}

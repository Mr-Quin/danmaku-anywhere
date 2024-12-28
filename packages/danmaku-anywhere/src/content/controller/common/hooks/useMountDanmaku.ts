import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import type { Danmaku } from '@/common/danmaku/models/danmaku'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import { useRefreshComments } from '@/content/controller/common/hooks/useRefreshComments'
import { useStore } from '@/content/controller/store/store'

// Send danmaku to the frame
export const useMountDanmaku = () => {
  const { toast } = useToast()

  // const { canRefresh, refreshComments } = useRefreshComments()

  const { mustGetActiveFrame } = useStore.use.frame()
  const setDanmakuLite = useStore.use.setDanmakuLite()
  const setComments = useStore.use.setComments()

  return useMutation({
    mutationFn: async (danmaku: Danmaku) => {
      const res = await playerRpcClient.player.mount({
        frameId: mustGetActiveFrame(),
        data: danmaku.comments,
      })
      if (!res.data) {
        throw new Error('Failed to mount danmaku')
      }
    },
    onSuccess: (_, danmaku) => {
      setDanmakuLite(danmaku)
      setComments(danmaku.comments)
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

export const useUnmountDanmaku = () => {
  const { toast } = useToast()

  const { activeFrame } = useStore.use.frame()

  const unsetComments = useStore.use.unsetComments()

  return useMutation({
    mutationFn: async (frameId: number | void) => {
      const frame = frameId ?? activeFrame
      if (frame === undefined) throw new Error('No active frame')
      await playerRpcClient.player.unmount({
        frameId: frame,
      })
      unsetComments()
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

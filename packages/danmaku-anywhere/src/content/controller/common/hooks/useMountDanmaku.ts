import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import type { Danmaku } from '@/common/danmaku/models/danmaku'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import { useStore } from '@/content/controller/store/store'

// Send danmaku to the frame
export const useMountDanmaku = () => {
  const { toast } = useToast()

  const { mustGetActiveFrame, updateFrame } = useStore.use.frame()
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
      updateFrame(mustGetActiveFrame(), { mounted: true })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

export const useUnmountDanmaku = () => {
  const { toast } = useToast()
  const { t } = useTranslation()

  const { activeFrame } = useStore.use.frame()

  const resetMediaState = useStore.use.resetMediaState()

  return useMutation({
    mutationFn: async (frameId: number | void) => {
      const frame = frameId ?? activeFrame
      if (frame === undefined)
        throw new Error('Trying to unmount danmaku without an active frame')

      await playerRpcClient.player.unmount({
        frameId: frame,
      })
    },
    onSuccess: () => {
      resetMediaState()
      toast.info(t('danmaku.alert.unmounted'))
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

export const useShowDanmaku = () => {
  const { toast } = useToast()
  const toggleVisible = useStore.use.toggleVisible()
  const visible = useStore.use.visible()

  const { mustGetActiveFrame } = useStore.use.frame()

  return useMutation({
    mutationFn: async () => {
      await playerRpcClient.player.show({
        frameId: mustGetActiveFrame(),
        data: !visible,
      })
    },
    onSuccess: () => {
      toggleVisible()
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { Logger } from '@/common/Logger'
import { controlQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { useStore } from '@/content/controller/store/store'

const urlBlacklist = ['about:blank']

export const useInjectFrames = () => {
  const { allFrames, addFrame, removeFrame, activeFrame, setActiveFrame } =
    useStore.use.frame()

  const injectedFrames = useRef(new Set<number>(allFrames.keys())).current

  const { data: frames, isSuccess } = useQuery({
    queryFn: async () => {
      // Suppress logs for getAllFrames since it's called repeatedly
      return chromeRpcClient.getAllFrames(undefined, { silent: true })
    },
    queryKey: controlQueryKeys.allFrames(),
    select: (res) => {
      return res.data.filter((frame) => {
        return !urlBlacklist.includes(frame.url)
      })
    },
    staleTime: Infinity,
    refetchInterval: 5000, // poll every 5s
  })

  const injectFrameMutation = useMutation({
    mutationFn: async (
      frame: chrome.webNavigation.GetAllFrameResultDetails
    ) => {
      const { frameId } = frame

      Logger.debug('Injecting player into frame', frame)
      injectedFrames.add(frameId)

      await chromeRpcClient.injectScript(frameId)
    },
    onSuccess: (_, frame) => {
      addFrame({
        frameId: frame.frameId,
        url: frame.url,
      })
      // If there is no active frame, set the first frame as active
      if (!activeFrame) setActiveFrame(frame.frameId)
      injectedFrames.add(frame.frameId)
    },
    onError: (e, frame) => {
      Logger.error('Failed to inject script', e)
      injectedFrames.delete(frame.frameId)
    },
  })

  useEffect(() => {
    if (!isSuccess) return

    // inject script into all frames
    frames.forEach((frame) => {
      if (injectedFrames.has(frame.frameId)) return
      injectFrameMutation.mutate(frame)
    })

    // when a frame is removed, remove it from the store
    const currentFrameIds = new Set(frames.map((frame) => frame.frameId))
    const prevFrameIds = new Set(allFrames.keys())
    const deletedIds = prevFrameIds.difference(currentFrameIds)

    deletedIds.forEach((frameId) => {
      removeFrame(frameId)
    })
  }, [frames])
}

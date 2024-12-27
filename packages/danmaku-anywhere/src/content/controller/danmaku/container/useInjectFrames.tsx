import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { Logger } from '@/common/Logger'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

const urlBlacklist = ['about:blank']

interface UseFramesOptions {
  onFrameRemoved?: (frameId: number) => void
}

export const useInjectFrames = (options: UseFramesOptions) => {
  const [prevFrameIds, setPrevFrameIds] = useState<Set<number>>(
    new Set<number>()
  )

  const injectedFrames = useRef(new Set<number>()).current

  const { data: frames, isSuccess } = useQuery({
    queryFn: async () => {
      if (frames) {
        setPrevFrameIds(new Set(frames.map((frame) => frame.frameId)))
      }

      // Suppress logs for getAllFrames since it's called repeatedly
      return chromeRpcClient.getAllFrames(undefined, { silent: true })
    },
    queryKey: [
      {
        scope: 'control',
        kind: 'getAllFrames',
      },
    ],
    select: (res) => {
      return res.data.filter((frame) => {
        return !urlBlacklist.includes(frame.url)
      })
    },
    staleTime: Infinity,
    refetchInterval: 1000, // poll every 1s
  })

  const frameIds = new Set(frames?.map((frame) => frame.frameId))

  const mutation = useMutation({
    mutationFn: async (frameId: number) => {
      // ensure we only inject once into each frame
      if (injectedFrames.has(frameId)) {
        return
      }
      Logger.debug('Injecting player into frame', frameId)
      injectedFrames.add(frameId)

      try {
        await chromeRpcClient.injectScript(frameId)
      } catch (e) {
        Logger.error('Failed to inject script', e)
        injectedFrames.delete(frameId)
      }
    },
  })

  useEffect(() => {
    if (!isSuccess) return

    frames.forEach((frame) => {
      mutation.mutate(frame.frameId)
    })

    const deletedIds = prevFrameIds.difference(frameIds)
    deletedIds.forEach((frameId) => {
      if (options.onFrameRemoved) {
        options.onFrameRemoved(frameId)
      }
    })
  }, [isSuccess, frames])

  const allFrames = frames ?? []

  return {
    allFrames,
    frameIds: frameIds,
    prevFrameIds,
  }
}

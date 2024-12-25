import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { Logger } from '@/common/Logger'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

const urlBlacklist = ['about:blank']

export const useFrames = () => {
  const [prevFrameIds, setPrevFrameIds] = useState<Set<number>>(
    new Set<number>()
  )

  const injectedFrames = useRef(new Set<number>()).current

  const { data: frames, isSuccess } = useQuery({
    queryFn: async () => {
      if (frames) {
        setPrevFrameIds(new Set(frames.map((frame) => frame.frameId)))
      }

      return chromeRpcClient.getAllFrames()
    },
    queryKey: [
      {
        scope: 'control',
        kind: 'getAllFrames',
      },
    ],
    select: (res) => res.data,
    staleTime: Infinity,
    refetchInterval: 1000, // poll every 1s
  })

  const mutation = useMutation({
    mutationFn: async (frameId: number) => {
      // ensure we only inject once into each frame
      if (injectedFrames.has(frameId)) {
        Logger.debug('Injecting player into frame', frameId)
        return
      }
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

    frames
      .filter((frame) => {
        return !urlBlacklist.includes(frame.url)
      })
      .forEach((frame) => {
        mutation.mutate(frame.frameId)
      })
  }, [isSuccess, frames])

  const allFrames = frames ?? []

  return {
    allFrames,
    frameIds: new Set(allFrames.map((frame) => frame.frameId)),
    prevFrameIds,
  }
}

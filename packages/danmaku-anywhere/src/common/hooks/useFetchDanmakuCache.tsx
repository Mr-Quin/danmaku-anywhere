import type { DanDanCommentAPIResult } from '@danmaku-anywhere/danmaku-engine'
import { useState } from 'react'

import { danmakuMessage } from '@/common/messages/danmakuMessage'

export const useFetchDanmaku = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<DanDanCommentAPIResult>()
  const [error, setError] = useState<string>()

  const dispatchFetch = async (
    payload: Parameters<typeof danmakuMessage.fetch>[0]
  ) => {
    setIsLoading(true)
    setData(undefined)

    try {
      const res = await danmakuMessage.fetch(payload)

      setData(res)

      return res
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    fetch: dispatchFetch,
    data,
    error,
    isLoading,
  }
}

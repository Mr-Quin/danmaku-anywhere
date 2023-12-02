import { useState } from 'react'
import { DanDanCommentAPIResult } from '@danmaku-anywhere/danmaku-engine'
import { danmakuAction } from '@/common/messages/danmakuMessage'

export const useFetchDanmaku = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<DanDanCommentAPIResult>()
  const [error, setError] = useState<string>()

  const dispatchFetch = async (
    payload: Parameters<typeof danmakuAction.fetch>[0]
  ) => {
    setIsLoading(true)
    setData(undefined)

    try {
      const res = await danmakuAction.fetch(payload)

      if (res.type === 'error') {
        throw new Error('Failed to fetch danmaku', { cause: res.payload })
      }

      setData(res.payload)

      return res
    } catch (e: any) {
      setError(e.message)
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

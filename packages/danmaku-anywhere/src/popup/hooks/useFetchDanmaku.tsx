import { useState } from 'react'
import { DanDanCommentAPIResult } from '@danmaku-anywhere/danmaku-engine'
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

      if (res.success === false) {
        throw new Error('Failed to fetch danmaku', { cause: res.error })
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

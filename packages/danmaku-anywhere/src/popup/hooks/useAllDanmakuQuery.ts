import { useSuspenseQuery } from '@tanstack/react-query'

import { danmakuMessage } from '@/common/messages/danmakuMessage'

export const useAllDanmakuQuery = () => {
  const query = useSuspenseQuery({
    queryKey: ['danmakuCache', 'all'],
    queryFn: async () => {
      const res = await danmakuMessage.getAll({})
      if (!res) throw new Error('Failed to get danmaku from cache')
      return res
    },
  })

  return query
}

useAllDanmakuQuery.queryKey = ['danmakuCache', 'all']

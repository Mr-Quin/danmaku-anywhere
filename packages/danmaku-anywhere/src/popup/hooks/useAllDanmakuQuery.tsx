import type { UseQueryOptions } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'

import { danmakuMessage } from '@/common/messages/danmakuMessage'

export const useAllDanmakuQuery = ({
  enabled = false,
}: Pick<UseQueryOptions, 'enabled'> = {}) => {
  const query = useQuery({
    queryKey: ['danmakuCache', 'getAll'],
    queryFn: async () => {
      const res = await danmakuMessage.getAll({})
      if (!res) throw new Error('Failed to get danmaku from cache')
      return res
    },
    enabled,
  })

  return query
}

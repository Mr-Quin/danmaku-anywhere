import { useQuery } from '@tanstack/react-query'

import { danmakuMessage } from '@/common/messages/danmakuMessage'

export const useDanmakuQuery = (episodeId?: number) => {
  const query = useQuery({
    queryKey: ['danmakuCache', episodeId],
    queryFn: async () => {
      const res = await danmakuMessage.getByEpisodeId({ episodeId: episodeId! })
      if (!res) throw new Error('Failed to get danmaku from cache')
      return res
    },
    enabled: episodeId !== undefined,
  })

  return query
}

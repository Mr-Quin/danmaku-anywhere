import { useQuery } from '@tanstack/react-query'

import { danmakuMessage } from '@/common/messages/danmakuMessage'

export const useDanmakuQuery = (episodeId?: number) => {
  const query = useQuery({
    queryKey: ['getByEpisodeId', episodeId],
    queryFn: async () => {
      const res = await danmakuMessage.getByEpisodeId({ episodeId: episodeId! })
      return res
    },
    enabled: episodeId !== undefined,
  })

  return query
}

import { useSuspenseQuery } from '@tanstack/react-query'

import { danmakuMessage } from '@/common/messages/danmakuMessage'

export const useDanmakuQuerySuspense = (episodeId: number) => {
  const query = useSuspenseQuery({
    queryKey: ['getByEpisodeId', episodeId],
    queryFn: async () => {
      return await danmakuMessage.getByEpisodeId({ episodeId: episodeId })
    },
  })

  return query
}

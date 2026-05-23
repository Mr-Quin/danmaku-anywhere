import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { publishDataChange } from '@/common/messaging/dataChangeChannel'
import {
  customEpisodeQueryKeys,
  episodeQueryKeys,
  seasonQueryKeys,
} from '@/common/queries/queryKeys'

export const useInvalidateSeasonAndEpisode = () => {
  const queryClient = useQueryClient()

  return useCallback(() => {
    const keys = [
      seasonQueryKeys.all(),
      episodeQueryKeys.all(),
      customEpisodeQueryKeys.all(),
    ]
    for (const key of keys) {
      void queryClient.invalidateQueries({ queryKey: key })
    }
    publishDataChange({ type: 'invalidateQueries', keys })
  }, [queryClient])
}

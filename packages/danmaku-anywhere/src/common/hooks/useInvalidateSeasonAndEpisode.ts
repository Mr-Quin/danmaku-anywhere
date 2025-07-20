import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import {
  customEpisodeQueryKeys,
  episodeQueryKeys,
  seasonQueryKeys,
} from '@/common/queries/queryKeys'

export const useInvalidateSeasonAndEpisode = () => {
  const queryClient = useQueryClient()

  return useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: seasonQueryKeys.all(),
    })
    void queryClient.invalidateQueries({
      queryKey: episodeQueryKeys.all(),
    })
    void queryClient.invalidateQueries({
      queryKey: customEpisodeQueryKeys.all(),
    })
  }, [queryClient])
}

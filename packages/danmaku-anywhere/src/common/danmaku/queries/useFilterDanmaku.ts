import { isNotCustom } from '@/common/danmaku/utils'
import { queryClient } from '@/common/queries/queryClient'
import {
  customEpisodeQueryKeys,
  episodeQueryKeys,
} from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import type {
  CustomEpisodeLite,
  EpisodeLite,
} from '@danmaku-anywhere/danmaku-converter'
import { useMutation } from '@tanstack/react-query'

export const useFilterDanmaku = () =>
  useMutation({
    mutationFn: async (danmaku: EpisodeLite | CustomEpisodeLite) => {
      if (isNotCustom(danmaku)) {
        const data = await queryClient.fetchQuery({
          queryKey: episodeQueryKeys.filter({ id: danmaku.id }),
          queryFn: async () => {
            const res = await chromeRpcClient.episodeFilter({ id: danmaku.id })
            return res.data[0] || null
          },
        })
        if (!data) throw new Error('No danmaku found')
        return data
      } else {
        const data = await queryClient.fetchQuery({
          queryKey: customEpisodeQueryKeys.filter({ id: danmaku.id }),
          queryFn: async () => {
            const res = await chromeRpcClient.episodeFilterCustom({
              id: danmaku.id,
            })
            return res.data[0] || null
          },
        })
        if (!data) throw new Error('No danmaku found')
        return data
      }
    },
  })

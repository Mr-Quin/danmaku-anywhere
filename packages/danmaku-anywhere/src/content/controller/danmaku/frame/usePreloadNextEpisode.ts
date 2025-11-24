import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import { useMutation } from '@tanstack/react-query'
import { isProvider } from '@/common/danmaku/utils'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { useStore } from '@/content/controller/store/store'

export const usePreloadNextEpisode = () => {
  const { episodes } = useStore.use.danmaku()

  return {
    canLoadNext: () => {
      return episodes?.length === 1
    },
    preloadNext: useMutation({
      mutationFn: async () => {
        if (!episodes || episodes.length !== 1) {
          return null
        }

        const episode = episodes[0]

        if (isProvider(episode, DanmakuSourceType.DanDanPlay)) {
          return chromeRpcClient.episodePreloadNext({
            type: 'by-meta',
            meta: episode,
          })
        }

        return null
      },
    }),
  }
}

import type { Episode, WithSeason } from '@danmaku-anywhere/danmaku-converter'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { useStore } from '@/content/controller/store/store'

export const usePreloadNextEpisode = () => {
  const { episodes } = useStore.use.danmaku()

  const canLoadNext = () => {
    return episodes?.length === 1
  }

  const preloadNext = async () => {
    if (!episodes || episodes.length !== 1) {
      return
    }
    await chromeRpcClient.episodePreloadNext(episodes[0] as WithSeason<Episode>)
  }

  return { canLoadNext, preloadNext }
}

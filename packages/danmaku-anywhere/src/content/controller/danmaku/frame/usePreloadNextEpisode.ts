import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import { isProvider } from '@/common/danmaku/utils'
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

    const episode = episodes[0]

    if (isProvider(episode, DanmakuSourceType.DanDanPlay)) {
      await chromeRpcClient.episodePreloadNext({
        type: 'by-meta',
        meta: episode,
      })
    }
  }

  return { canLoadNext, preloadNext }
}

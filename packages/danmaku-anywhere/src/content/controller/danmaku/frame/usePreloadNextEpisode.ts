import { isNotCustom } from '@/common/danmaku/utils'
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
    // Custom episodes have no season to preload from.
    if (!isNotCustom(episode)) {
      return
    }
    // Drop comments so the message stays small; preload is best-effort.
    const { comments: _, ...meta } = episode
    await chromeRpcClient.episodePreloadNext(meta, { optional: true })
  }

  return { canLoadNext, preloadNext }
}

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
    // Custom (local) episodes have no season, so there is no bookmark to
    // preload from. Provider-agnostic otherwise.
    if (!isNotCustom(episode)) {
      return
    }
    // Best-effort background optimization: a failed preload should not surface
    // an error to the user mid-playback.
    await chromeRpcClient.episodePreloadNext(episode, { optional: true })
  }

  return { canLoadNext, preloadNext }
}

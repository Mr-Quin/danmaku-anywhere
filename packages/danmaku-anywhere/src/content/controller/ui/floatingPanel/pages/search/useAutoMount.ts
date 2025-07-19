import type {
  CustomEpisodeLite,
  EpisodeLite,
} from '@danmaku-anywhere/danmaku-converter'
import { useCallback } from 'react'
import { useMountDanmakuContent } from '@/content/controller/ui/floatingPanel/pages/mount/useMountDanmakuContent'

/**
 * Hook to handle auto-mounting episodes in content script context
 */
export const useAutoMount = () => {
  const { mutate: mountDanmaku, isPending } = useMountDanmakuContent()

  const autoMountEpisode = useCallback(
    (episodeData: any) => {
      // Extract episode information from the imported data
      // This assumes the episodeData contains the episode information
      // that can be used to mount the danmaku
      if (episodeData && episodeData.meta) {
        const episodeLite: EpisodeLite | CustomEpisodeLite = {
          id: episodeData.meta.id || episodeData.meta.episodeId,
          title: episodeData.meta.title,
          provider: episodeData.meta.provider || 'Custom',
          seasonId: episodeData.meta.season?.id || episodeData.meta.seasonId,
        } as EpisodeLite | CustomEpisodeLite

        mountDanmaku(episodeLite)
      }
    },
    [mountDanmaku]
  )

  return {
    autoMountEpisode,
    isMounting: isPending,
  }
}

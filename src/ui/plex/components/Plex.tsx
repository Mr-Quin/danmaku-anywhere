import { useEffect } from 'preact/hooks'
import { createPortal } from 'preact/compat'
import { useParsePlexMedia } from '../hooks/useParsePlexMedia'
import { useMonitorPlexToolbar } from '../hooks/useMonitorPlexToolbar'
import { useFetchMedia } from '../hooks/useFetchPlexMedia'
import { useCreatePlexPortal } from '../hooks/useCreatePlexPortal'
import { useCreatePlexDanmaku } from '../hooks/useCreatePlexDanmaku'
import { PlexToolbar } from './PlexToolbar'
import { useStore } from '@/store/store'
import { logger } from '@/utils/logger'

export const Plex = () => {
  const resetDanmaku = useStore.use.resetDanmaku()
  const isMediaActive = useStore.use.isMediaActive()

  const root = useMonitorPlexToolbar()
  const plexMedia = useParsePlexMedia()
  useFetchMedia(plexMedia)
  useCreatePlexPortal()
  useCreatePlexDanmaku()

  useEffect(() => {
    if (plexMedia) {
      logger.debug('Currently playing', plexMedia)
    }
  }, [plexMedia])

  useEffect(() => {
    if (!isMediaActive) {
      // when media changes, reset danmaku data and engine
      logger.debug('Video player lost, resetting danmaku')
      resetDanmaku()
    }
  }, [isMediaActive])

  return root && createPortal(<PlexToolbar />, root)
}

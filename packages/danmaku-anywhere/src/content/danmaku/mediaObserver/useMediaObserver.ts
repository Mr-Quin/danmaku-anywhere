import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'

import { useStore } from '../../store/store'

import { useMatchObserver } from './useMatchObserver'

import { useMatchEpisode } from '@/common/anime/queries/useMatchEpisode'
import { useToast } from '@/common/components/Toast/toastStore'
import { Logger } from '@/common/Logger'
import { useActiveConfig } from '@/content/common/hooks/useActiveConfig'
import type { MediaInfo } from '@/content/danmaku/integration/MediaInfo'

export const useMediaObserver = () => {
  const { t } = useTranslation()
  const config = useActiveConfig()

  const { toast } = useToast()

  const activeObserver = useMatchObserver()

  const {
    mediaInfo,
    setMediaInfo,
    playbackStatus,
    setPlaybackStatus,

    resetMediaState,
  } = useStore(useShallow((state) => state))

  const matchEpisode = useMatchEpisode()

  useEffect(() => {
    if (!activeObserver) return

    activeObserver.on({
      mediaChange: async (state: MediaInfo) => {
        resetMediaState()
        setMediaInfo(state)

        const episodeMatchPayload = {
          mapKey: state.key(),
          title: state.title,
          episodeNumber: state.episode,
          integration: config.integration,
        }

        matchEpisode.mutate(episodeMatchPayload)
      },
      statusChange: (status) => {
        setPlaybackStatus(status)
      },
    })

    activeObserver.setup()

    return () => activeObserver.destroy()
  }, [activeObserver])

  useEffect(() => {
    if (!mediaInfo) return

    if (playbackStatus === 'playing') {
      toast.info(
        t('integration.alert.playing', { title: mediaInfo.toString() })
      )
      Logger.debug(`Playback started: ${mediaInfo.toString()}`)
    } else if (playbackStatus === 'paused') {
      Logger.debug(`Playback Paused`)
    } else if (playbackStatus === 'stopped') {
      useStore.getState().resetMediaState()
      Logger.debug(`Playback Stopped`)
    }
  }, [playbackStatus, mediaInfo])

  return activeObserver
}

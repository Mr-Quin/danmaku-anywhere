import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'

import { useStore } from '../../store/store'

import { useToast } from '@/common/components/Toast/toastStore'
import { hasIntegration } from '@/common/danmaku/enums'
import { Logger } from '@/common/Logger'
import { useMatchXPathPolicy } from '@/common/options/xpathPolicyStore/useMatchXPathPolicy'
import { useActiveConfig } from '@/content/common/hooks/useActiveConfig'
import type { MediaInfo } from '@/content/danmaku/integration/MediaInfo'
import { XPathObserver } from '@/content/danmaku/integration/XPathObserver'
import { useMatchEpisode } from '@/content/danmaku/mediaObserver/useMatchEpisode'

export const useMediaObserver = () => {
  const { t } = useTranslation()
  const config = useActiveConfig()

  const { toast } = useToast()

  const {
    mediaInfo,
    setMediaInfo,
    playbackStatus,
    setPlaybackStatus,
    resetMediaState,
    setIntegration,
    toggleManualMode,
  } = useStore(useShallow((state) => state))

  const matchEpisode = useMatchEpisode()
  const xpathPolicy = useMatchXPathPolicy(config.integration)

  useEffect(() => {
    if (!xpathPolicy) {
      toggleManualMode(true)
      setIntegration()
      return
    }

    toggleManualMode(false)
    setIntegration(xpathPolicy.name)
    toast.info(
      t('integration.alert.usingIntegration', { name: xpathPolicy.name })
    )
    Logger.debug(`Using integration: ${config.integration}`)

    const observer = new XPathObserver(xpathPolicy.policy)

    observer.on({
      mediaChange: async (state: MediaInfo) => {
        if (!hasIntegration(config.integration)) return

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

    observer.setup()

    return () => observer.destroy()
  }, [xpathPolicy])

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
      // useStore.getState().resetMediaState()
      Logger.debug(`Playback Stopped`)
    }
  }, [playbackStatus, mediaInfo])
}

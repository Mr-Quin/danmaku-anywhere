import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'

import { useStore } from '../../../store/store'

import { useToast } from '@/common/components/Toast/toastStore'
import { Logger } from '@/common/Logger'
import { useMatchIntegrationPolicy } from '@/common/options/integrationPolicyStore/useMatchIntegrationPolicy'
import { useActiveConfig } from '@/content/common/hooks/useActiveConfig'
import { useMatchEpisode } from '@/content/danmaku/integration/hooks/useMatchEpisode'
import type { MediaInfo } from '@/content/danmaku/integration/models/MediaInfo'
import { IntegrationPolicyObserver } from '@/content/danmaku/integration/observers/IntegrationPolicyObserver'

export const useIntegrationPolicy = () => {
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
  const integrationPolicy = useMatchIntegrationPolicy(config.integration)

  useEffect(() => {
    if (!integrationPolicy) {
      toggleManualMode(true)
      setIntegration()
      return
    }

    toggleManualMode(false)
    setIntegration(integrationPolicy.name)
    toast.info(
      t('integration.alert.usingIntegration', { name: integrationPolicy.name })
    )
    Logger.debug(`Using integration: ${integrationPolicy.name}`)

    const observer = new IntegrationPolicyObserver(integrationPolicy.policy)

    observer.on({
      mediaChange: async (state: MediaInfo) => {
        resetMediaState()
        setMediaInfo(state)

        const episodeMatchPayload = {
          mapKey: state.key(),
          title: state.title,
          episodeNumber: state.episodic ? state.episode : undefined,
        }

        matchEpisode.mutate(episodeMatchPayload)
      },
      statusChange: (status) => {
        setPlaybackStatus(status)
      },
    })

    observer.setup()

    return () => observer.destroy()
  }, [integrationPolicy])

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

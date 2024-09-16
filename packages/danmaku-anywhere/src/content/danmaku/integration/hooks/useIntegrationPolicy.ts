import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'

import { useStore } from '../../../store/store'

import { useToast } from '@/common/components/Toast/toastStore'
import { Logger } from '@/common/Logger'
import { useActiveIntegration } from '@/common/options/integrationPolicyStore/useActiveIntegration'
import { useMatchEpisode } from '@/content/danmaku/integration/hooks/useMatchEpisode'
import type { MediaInfo } from '@/content/danmaku/integration/models/MediaInfo'
import { IntegrationPolicyObserver } from '@/content/danmaku/integration/observers/IntegrationPolicyObserver'
import { useMediaElementStore } from '@/content/store/mediaElementStore'

export const useIntegrationPolicy = () => {
  const { t } = useTranslation()

  const { toast } = useToast()

  const { videoNode } = useMediaElementStore()
  const [observer, setObserver] = useState<IntegrationPolicyObserver | null>(
    null
  )

  const { setMediaInfo, resetMediaState, toggleManualMode, manual } = useStore(
    useShallow((state) => state)
  )

  const matchEpisode = useMatchEpisode()
  const integrationPolicy = useActiveIntegration()

  useEffect(() => {
    if (!integrationPolicy || manual) {
      toggleManualMode(true)
      resetMediaState()
      setObserver(null)
      return
    }

    if (!videoNode) {
      observer?.reset()
      return
    }

    toggleManualMode(false)
    toast.info(
      t('integration.alert.usingIntegration', { name: integrationPolicy.name })
    )
    Logger.debug(`Using integration: ${integrationPolicy.name}`)

    const obs = new IntegrationPolicyObserver(integrationPolicy.policy)
    setObserver(obs)

    obs.on({
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
    })

    obs.setup()

    return () => {
      obs.destroy()
      setObserver(null)
    }
  }, [integrationPolicy, manual, videoNode])
}

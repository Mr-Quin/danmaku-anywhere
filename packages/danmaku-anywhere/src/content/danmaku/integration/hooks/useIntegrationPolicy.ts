import { useEffect, useRef, useState } from 'react'
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

  const [hasVideoNode, setHasVideoNode] = useState(!!videoNode)

  const observer = useRef<IntegrationPolicyObserver>()

  const { setMediaInfo, resetMediaState, toggleManualMode, manual } = useStore(
    useShallow((state) => state)
  )

  const matchEpisode = useMatchEpisode()
  const integrationPolicy = useActiveIntegration()

  useEffect(() => {
    if (!integrationPolicy) {
      toggleManualMode(true)
      return
    }

    toggleManualMode(false)

    toast.info(
      t('integration.alert.usingIntegration', { name: integrationPolicy.name })
    )
    Logger.debug(`Using integration: ${integrationPolicy.name}`)
  }, [integrationPolicy])

  useEffect(() => {
    let timeout: NodeJS.Timeout
    if (!videoNode) {
      // Set the hasVideoNode to false after a delay to prevent flickering
      timeout = setTimeout(() => {
        setHasVideoNode(false)
      }, 5000)
    } else {
      setHasVideoNode(true)
    }
    return () => {
      clearTimeout(timeout)
    }
  }, [videoNode])

  useEffect(() => {
    if (!integrationPolicy || manual) {
      resetMediaState()
      observer.current = undefined
      return
    }

    // Only create the observer if the video node is present
    if (!hasVideoNode) {
      observer.current?.reset()
      return
    }

    const obs = new IntegrationPolicyObserver(integrationPolicy.policy)
    observer.current = obs

    obs.on({
      mediaChange: async (state: MediaInfo) => {
        resetMediaState()
        setMediaInfo(state)

        const episodeMatchPayload = {
          mapKey: state.key(),
          title: state.title,
          episodeNumber: state.episodic ? state.episode : undefined,
        }

        toast.info(t('integration.alert.search', { title: state.toString() }))
        matchEpisode.mutate(episodeMatchPayload)
      },
    })

    obs.setup()

    return () => {
      obs.destroy()
      observer.current = undefined
    }
  }, [integrationPolicy, manual, hasVideoNode])
}

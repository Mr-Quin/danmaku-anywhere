import { inject, injectable } from 'inversify'
import { type ActorRefFrom, createActor } from 'xstate'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { IntegrationPolicy } from '@/common/options/integrationPolicyStore/schema'
import {
  isConfigIncomplete,
  isConfigPermissive,
} from '@/common/options/mountConfig/isPermissive'
import type { MountConfig } from '@/common/options/mountConfig/schema'
import {
  type IntegrationEvent,
  integrationMachine,
} from '@/content/controller/danmaku/integration/integrationMachine'
import type { MediaObserver } from '@/content/controller/danmaku/integration/observers/MediaObserver'
import { ObserverFactory } from '@/content/controller/danmaku/integration/observers/ObserverFactory'
import { useStore } from '@/content/controller/store/store'

export type ConfigWarning = 'incomplete' | 'permissive'

@injectable('Singleton')
export class IntegrationService {
  private logger: ILogger
  private actor: ActorRefFrom<typeof integrationMachine>
  private observer: MediaObserver | null = null

  constructor(@inject(LoggerSymbol) logger: ILogger) {
    this.logger = logger.sub('[IntegrationService]')

    this.actor = createActor(integrationMachine)

    this.actor.subscribe((snapshot) => {
      this.syncStoreFromMachine(snapshot)
    })

    this.actor.start()
  }

  send(event: IntegrationEvent) {
    this.actor.send(event)
  }

  getSnapshot() {
    return this.actor.getSnapshot()
  }

  subscribe(listener: (snapshot: ReturnType<typeof this.getSnapshot>) => void) {
    return this.actor.subscribe(listener)
  }

  /**
   * Called when config or integration policy changes.
   * Handles observer creation/destruction.
   */
  handleConfigChange(
    config: MountConfig,
    policy: IntegrationPolicy | null
  ): { warning?: ConfigWarning } {
    // Destroy existing observer
    this.destroyObserver()

    if (config.mode === 'manual') {
      this.send({ type: 'CONFIG_CHANGED', config, policy })
      return {}
    }

    if (isConfigIncomplete(config)) {
      // Don't send CONFIG_CHANGED — stay idle or go manual
      this.send({
        type: 'CONFIG_CHANGED',
        config: { ...config, mode: 'manual' } as MountConfig,
        policy,
      })
      return { warning: 'incomplete' as const }
    }

    if (isConfigPermissive(config) && config.mode === 'ai') {
      this.send({
        type: 'CONFIG_CHANGED',
        config: { ...config, mode: 'manual' } as MountConfig,
        policy,
      })
      return { warning: 'permissive' as const }
    }

    // Create observer
    this.observer = ObserverFactory.create(config, policy)
    this.logger.debug('Created observer', this.observer.name)
    this.wireObserverEvents()
    this.observer.setup()

    this.send({ type: 'CONFIG_CHANGED', config, policy })
    return {}
  }

  /**
   * Called when video state changes in the active frame.
   */
  handleVideoChange(hasVideo: boolean) {
    if (hasVideo) {
      if (this.observer) {
        this.observer.run()
      }
      this.send({ type: 'VIDEO_DETECTED' })
    } else {
      if (this.observer) {
        this.observer.reset()
      }
      this.send({ type: 'VIDEO_REMOVED' })
    }
  }

  /**
   * Called from manual mount flow.
   */
  handleManualMount(
    episodes: import('@danmaku-anywhere/danmaku-converter').GenericEpisode[]
  ) {
    this.send({ type: 'MANUAL_MOUNT', episodes })
  }

  /**
   * Called when danmaku is unmounted.
   */
  handleUnmount() {
    this.send({ type: 'UNMOUNT' })
  }

  destroy() {
    this.destroyObserver()
    this.actor.stop()
  }

  private wireObserverEvents() {
    if (!this.observer) {
      return
    }

    this.observer.on({
      mediaChange: (mediaInfo) => {
        this.send({ type: 'MEDIA_FOUND', mediaInfo })
      },
      mediaElementsChange: () => {
        const store = useStore.getState()
        store.integration.setFoundElements(true)
      },
      error: (error) => {
        this.send({ type: 'ERROR', message: error.message })
      },
    })
  }

  private destroyObserver() {
    if (this.observer) {
      this.observer.destroy()
      this.observer = null
    }
  }

  private syncStoreFromMachine(snapshot: ReturnType<typeof this.getSnapshot>) {
    const store = useStore.getState()
    const state = snapshot.value as string
    const ctx = snapshot.context

    // Sync integration.active
    const isActive = state !== 'idle' && state !== 'manual'
    if (store.integration.active !== isActive) {
      if (isActive) {
        store.integration.activate()
      } else {
        store.integration.deactivate()
      }
    }

    // Sync mediaInfo
    if (ctx.mediaInfo !== store.integration.mediaInfo) {
      if (ctx.mediaInfo) {
        store.integration.setMediaInfo(ctx.mediaInfo)
      }
    }

    // Sync error
    if (ctx.error !== store.integration.errorMessage) {
      store.integration.setErrorMessage(ctx.error ?? undefined)
    }

    // Reset integration state when going back to idle/waitingForVideo
    if (state === 'idle' || state === 'waitingForVideo') {
      if (store.integration.mediaInfo || store.integration.errorMessage) {
        store.integration.resetIntegration()
      }
    }
  }
}

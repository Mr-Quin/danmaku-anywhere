import type { IntegrationPolicy } from '@/common/options/integrationPolicyStore/schema'
import type { MountConfig } from '@/common/options/mountConfig/schema'
import { AiIntegrationObserver } from '@/content/controller/danmaku/integration/observers/AiIntegrationObserver'
import type { MediaObserver } from '@/content/controller/danmaku/integration/observers/MediaObserver'
import { XPathIntegrationObserver } from '@/content/controller/danmaku/integration/observers/XPathIntegrationObserver'
import { NoopMediaObserver } from './NoopMediaObserver'

export class ObserverFactory {
  static create(
    config: MountConfig,
    policy: IntegrationPolicy | null
  ): MediaObserver {
    switch (config.mode) {
      case 'ai':
        return new AiIntegrationObserver(config)
      case 'xpath':
        return new XPathIntegrationObserver(policy)
      case 'manual':
      default:
        return new NoopMediaObserver()
    }
  }
}

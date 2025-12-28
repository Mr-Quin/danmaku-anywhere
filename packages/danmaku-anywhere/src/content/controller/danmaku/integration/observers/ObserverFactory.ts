import type { IntegrationPolicy } from '@/common/options/integrationPolicyStore/schema'
import type { AutomationMode } from '@/common/options/mountConfig/schema'
import { AiIntegrationObserver } from '@/content/controller/danmaku/integration/observers/AiIntegrationObserver'
import type { MediaObserver } from '@/content/controller/danmaku/integration/observers/MediaObserver'
import { XPathIntegrationObserver } from '@/content/controller/danmaku/integration/observers/XPathIntegrationObserver'
import { NoopMediaObserver } from './NoopMediaObserver'

export class ObserverFactory {
  static create(
    mode: AutomationMode,
    policy: IntegrationPolicy | null
  ): MediaObserver {
    switch (mode) {
      case 'ai':
        return new AiIntegrationObserver(policy)
      case 'xpath':
        return new XPathIntegrationObserver(policy)
      case 'manual':
      default:
        return new NoopMediaObserver()
    }
  }
}

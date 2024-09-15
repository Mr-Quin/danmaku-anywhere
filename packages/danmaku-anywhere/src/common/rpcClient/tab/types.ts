import type { RPCDef } from '../../rpc/types'

import type { Danmaku, DanmakuLite } from '@/common/danmaku/models/danmaku'
import type { XPathPolicyItem } from '@/common/options/xpathPolicyStore/schema'
import type { MediaInfo } from '@/content/danmaku/integration/MediaInfo'

interface TabDanmakuState {
  danmaku?: DanmakuLite
  manual: boolean
}

interface IntegrationPolicyTestSingleResult {
  found: boolean
  text: string | null
  parsed: string | number | null
}

export interface IntegrationPolicyTestResult {
  title: IntegrationPolicyTestSingleResult
  episodeNumber: IntegrationPolicyTestSingleResult
  seasonNumber: IntegrationPolicyTestSingleResult
  episodeTitle: IntegrationPolicyTestSingleResult
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type DanmakuMethods = {
  /**
   * Ping the tab to check if it's able to receive messages
   */
  ping: RPCDef<void, true>
  danmakuMount: RPCDef<Danmaku, void>
  danmakuUnmount: RPCDef<void, void>
  danmakuGetState: RPCDef<void, TabDanmakuState | null>
  integrationPolicyTest: RPCDef<XPathPolicyItem, IntegrationPolicyTestResult>
}

export type TabMethods = DanmakuMethods

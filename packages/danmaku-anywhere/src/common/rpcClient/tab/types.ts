import type { RPCDef } from '../../rpc/types'

import type { Danmaku, DanmakuLite } from '@/common/danmaku/models/danmaku'
import type { IntegrationPolicyItem } from '@/common/options/integrationPolicyStore/schema'
import type { MediaInfo } from '@/content/danmaku/integration/models/MediaInfo'

interface TabDanmakuState {
  danmaku?: DanmakuLite
  manual: boolean
}

export type IntegrationPolicyTestResult =
  | {
      error: false
      foundTitle: boolean
      foundEpisode: boolean
      foundSeason: boolean
      foundEpisodeTitle: boolean
      mediaInfo?: MediaInfo
    }
  | {
      error: true
      message: string
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
  integrationPolicyTest: RPCDef<
    IntegrationPolicyItem,
    IntegrationPolicyTestResult
  >
}

export type TabMethods = DanmakuMethods

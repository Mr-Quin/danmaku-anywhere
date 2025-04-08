import type { RPCDef } from '../../rpc/types'

import {
  EpisodeLiteV4,
  EpisodeV4,
  WithSeason,
} from '@/common/danmaku/types/v4/schema'

export interface TabDanmakuState {
  danmaku?: WithSeason<EpisodeLiteV4>
  manual: boolean
}

type DanmakuMethods = {
  /**
   * Ping the tab to check if it's able to receive messages
   */
  ping: RPCDef<void, true>
  danmakuMount: RPCDef<WithSeason<EpisodeV4>, void>
  danmakuUnmount: RPCDef<void, void>
  danmakuGetState: RPCDef<void, TabDanmakuState | null>
}

export type TabMethods = DanmakuMethods

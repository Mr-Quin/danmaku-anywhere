import type { RPCDef } from '../../rpc/types'

import type {
  CustomEpisodeLite,
  Episode,
  EpisodeLite,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'

export interface TabDanmakuState {
  danmaku?: WithSeason<EpisodeLite> | CustomEpisodeLite
  manual: boolean
}

type DanmakuMethods = {
  /**
   * Ping the tab to check if it's able to receive messages
   */
  ping: RPCDef<void, true>
  danmakuMount: RPCDef<WithSeason<Episode>, void>
  danmakuUnmount: RPCDef<void, void>
  danmakuGetState: RPCDef<void, TabDanmakuState | null>
}

export type TabMethods = DanmakuMethods

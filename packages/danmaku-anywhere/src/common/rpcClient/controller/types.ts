import type {
  CustomEpisode,
  CustomEpisodeLite,
  Episode,
  EpisodeLite,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { RPCDef } from '../../rpc/types'

export interface ControllerDanmakuState {
  danmaku?: WithSeason<EpisodeLite> | CustomEpisodeLite
  manual: boolean
}

type DanmakuMethods = {
  /**
   * Ping the tab to check if it's able to receive messages
   */
  ping: RPCDef<void, true>
  danmakuMount: RPCDef<WithSeason<Episode> | CustomEpisode, void>
  danmakuUnmount: RPCDef<void, void>
  danmakuGetState: RPCDef<void, ControllerDanmakuState | null>
}

export type ControllerMethods = DanmakuMethods

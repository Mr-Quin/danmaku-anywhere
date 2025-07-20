import type {
  GenericEpisode,
  GenericEpisodeLite,
} from '@danmaku-anywhere/danmaku-converter'
import type { RPCDef } from '../../rpc/types'

export interface ControllerDanmakuState {
  danmaku?: GenericEpisodeLite
  manual: boolean
}

export type ControllerMethods = {
  /**
   * Ping the tab to check if it's able to receive messages
   */
  ping: RPCDef<void, true>
  danmakuMount: RPCDef<GenericEpisode, void>
  danmakuUnmount: RPCDef<void, void>
  danmakuGetState: RPCDef<void, ControllerDanmakuState | null>
  invalidateCache: RPCDef<void, void>
}

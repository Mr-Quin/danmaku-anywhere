import type { RPCDef } from '../../rpc/types'

import type { Danmaku, DanmakuLite } from '@/common/danmaku/models/danmaku'

export interface TabDanmakuState {
  danmaku?: DanmakuLite
  manual: boolean
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
}

export type TabMethods = DanmakuMethods

import type { DanDanComment } from '@danmaku-anywhere/dandanplay-api'

import type { RPCDef } from '../rpc'

import type { DanmakuMeta } from '@/common/types/Danmaku'

export interface TabDanmakuState {
  meta?: DanmakuMeta
  count: number
  manual: boolean
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type DanmakuMethods = {
  /**
   * Ping the tab to check if it's able to receive messages
   */
  ping: RPCDef<void, true>
  danmakuMount: RPCDef<
    {
      meta: DanmakuMeta
      comments: DanDanComment[]
    },
    void
  >
  danmakuUnmount: RPCDef<void, void>
  danmakuGetState: RPCDef<void, TabDanmakuState | null>
}

export type TabMethods = DanmakuMethods

import type { DanDanComment } from '@danmaku-anywhere/dandanplay-api'

import type { RPCDef } from '../rpc'

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type DanmakuMethods = {
  danmakuMount: RPCDef<DanDanComment[], void>
  danmakuUnmount: RPCDef<void, void>
}

export type TabMethods = DanmakuMethods

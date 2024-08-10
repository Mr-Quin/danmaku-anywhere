import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'

import type { RPCDef } from '../../rpc/types'

import type { DanmakuMeta } from '@/common/danmaku/models/danmakuMeta'

interface TabDanmakuState {
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
      comments: CommentEntity[]
    },
    void
  >
  danmakuUnmount: RPCDef<void, void>
  danmakuGetState: RPCDef<void, TabDanmakuState | null>
}

export type TabMethods = DanmakuMethods

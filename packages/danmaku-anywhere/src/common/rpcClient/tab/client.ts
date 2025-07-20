import { createTabRpcClient } from '@/common/rpc/client'
import type {
  PlayerRelayCommands,
  PlayerRelayEvents,
} from '@/common/rpcClient/background/types'
import type { TabMethods } from '@/common/rpcClient/tab/types'

// For sending messages to the tab
export const tabRpcClient = createTabRpcClient<TabMethods>()

// For relaying messages from the tab to other frames
export const relayFrameClient = createTabRpcClient<
  PlayerRelayCommands & PlayerRelayEvents
>()

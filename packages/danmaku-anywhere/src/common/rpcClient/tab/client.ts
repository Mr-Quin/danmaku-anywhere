import { createRpcClient } from '@/common/rpc/client'
import { tabSender } from '@/common/rpc/sender'
import type {
  PlayerCommands,
  PlayerEvents,
} from '@/common/rpcClient/background/types'
import type { TabMethods } from '@/common/rpcClient/tab/types'

// For sending messages to the tab
export const tabRpcClient = createRpcClient<TabMethods>(tabSender)

// For relaying messages from the tab to other frames
export const relayFrameClient = createRpcClient<PlayerCommands & PlayerEvents>(
  tabSender
)

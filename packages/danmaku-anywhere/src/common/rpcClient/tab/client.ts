import { createRpcClient } from '@/common/rpc/client'
import { tabSender } from '@/common/rpc/sender'
import type {
  ManagerCommands,
  ManagerEvents,
} from '@/common/rpcClient/background/types'
import type { TabMethods } from '@/common/rpcClient/tab/types'

export const tabRpcClient = createRpcClient<TabMethods>(tabSender)

export const relayFrameClient = createRpcClient<
  ManagerCommands & ManagerEvents
>(tabSender)

import { createRpcClient } from '@/common/rpc/client'
import { tabSender } from '@/common/rpc/sender'
import type { TabMethods } from '@/common/rpcClient/tab/types'

export const tabRpcClient = createRpcClient<TabMethods>(tabSender)

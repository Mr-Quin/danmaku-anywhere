import { createRpcClient } from '@/common/rpc/client'
import { chromeSender } from '@/common/rpc/sender'
import type { BackgroundMethods } from '@/common/rpcClient/background/types'

export const chromeRpcClient = createRpcClient<BackgroundMethods>(chromeSender)

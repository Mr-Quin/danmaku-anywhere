import { createRpcClient } from '@/common/rpc/client'
import { chromeSender } from '@/common/rpc/sender'
import type {
  BackgroundMethods,
  PlayerCommands,
  PlayerEvents,
} from '@/common/rpcClient/background/types'

export const chromeRpcClient = createRpcClient<BackgroundMethods>(chromeSender)

export const playerRpcClient = {
  player: createRpcClient<PlayerCommands>(chromeSender),
  controller: createRpcClient<PlayerEvents>(chromeSender),
}

import { createChromeRpcClient } from '@/common/rpc/client'
import type {
  BackgroundMethods,
  PlayerCommands,
  PlayerEvents,
} from '@/common/rpcClient/background/types'

export const chromeRpcClient = createChromeRpcClient<BackgroundMethods>()

export const playerRpcClient = {
  player: createChromeRpcClient<PlayerCommands>(),
  controller: createChromeRpcClient<PlayerEvents>(),
}

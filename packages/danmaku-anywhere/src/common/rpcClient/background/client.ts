import { createChromeRpcClient } from '@/common/rpc/client'
import type {
  BackgroundMethods,
  PlayerRelayCommands,
  PlayerRelayEvents,
} from '@/common/rpcClient/background/types'

export const chromeRpcClient = createChromeRpcClient<BackgroundMethods>()

export const playerRpcClient = {
  player: createChromeRpcClient<PlayerRelayCommands>(),
  controller: createChromeRpcClient<PlayerRelayEvents>(),
}

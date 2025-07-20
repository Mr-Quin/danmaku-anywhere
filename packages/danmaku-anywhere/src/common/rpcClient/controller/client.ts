import { createTabRpcClient } from '@/common/rpc/client'
import type {
  PlayerRelayCommands,
  PlayerRelayEvents,
} from '@/common/rpcClient/background/types'
import type { ControllerMethods } from '@/common/rpcClient/controller/types'

// For sending messages to the controller
export const controllerRpcClient = createTabRpcClient<ControllerMethods>()

// For relaying messages from the tab to other frames
export const relayFrameClient = createTabRpcClient<
  PlayerRelayCommands & PlayerRelayEvents
>()

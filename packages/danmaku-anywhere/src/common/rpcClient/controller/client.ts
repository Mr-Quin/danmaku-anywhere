import { createContentRpcClient } from '@/common/rpc/client'
import type {
  PlayerRelayCommands,
  PlayerRelayEvents,
} from '@/common/rpcClient/background/types'
import type { ControllerMethods } from '@/common/rpcClient/controller/types'

// For sending messages to the controller
export const controllerRpcClient = createContentRpcClient<ControllerMethods>()

// For relaying messages from the tab to other frames
export const relayFrameClient = createContentRpcClient<
  PlayerRelayCommands & PlayerRelayEvents
>()

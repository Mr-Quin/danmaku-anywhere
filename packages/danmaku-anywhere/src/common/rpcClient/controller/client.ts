import { isStandaloneRuntime } from '@/common/environment/isStandalone'
import { createContentRpcClient } from '@/common/rpc/client'
import type {
  PlayerRelayCommands,
  PlayerRelayEvents,
} from '@/common/rpcClient/background/types'
import type { ControllerMethods } from '@/common/rpcClient/controller/types'
import { createStandaloneRpcClient } from '@/common/rpcClient/mock/createStandaloneRpcClient'
import {
  standaloneControllerHandlers,
  standalonePlayerCommandHandlers,
  standalonePlayerEventHandlers,
} from '@/common/rpcClient/mock/standaloneHandlers'

// For sending messages to the controller
export const controllerRpcClient = isStandaloneRuntime()
  ? createStandaloneRpcClient<ControllerMethods>({
      handlers: standaloneControllerHandlers,
    })
  : createContentRpcClient<ControllerMethods>()

// For relaying messages from the tab to other frames
export const relayFrameClient = isStandaloneRuntime()
  ? createStandaloneRpcClient<PlayerRelayCommands & PlayerRelayEvents>({
      handlers: {
        ...standalonePlayerCommandHandlers,
        ...standalonePlayerEventHandlers,
      },
      defaultContext: { frameId: 0 },
    })
  : createContentRpcClient<PlayerRelayCommands & PlayerRelayEvents>()

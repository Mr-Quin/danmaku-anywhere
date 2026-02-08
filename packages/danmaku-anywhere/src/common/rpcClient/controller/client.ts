import { IS_STANDALONE_RUNTIME } from '@/common/environment/isStandalone'
import { createContentRpcClient } from '@/common/rpc/client'
import type {
  PlayerRelayCommands,
  PlayerRelayEvents,
} from '@/common/rpcClient/background/types'
import type { ControllerMethods } from '@/common/rpcClient/controller/types'
import { createStandaloneRpcClient } from '@/common/standalone/createStandaloneRpcClient'
import {
  standaloneControllerHandlers,
  standalonePlayerCommandHandlers,
  standalonePlayerEventHandlers,
} from '@/common/standalone/standaloneHandlers'

// For sending messages to the controller
export const controllerRpcClient = IS_STANDALONE_RUNTIME
  ? createStandaloneRpcClient<ControllerMethods>({
      handlers: standaloneControllerHandlers,
    })
  : createContentRpcClient<ControllerMethods>()

// For relaying messages from the tab to other frames
export const relayFrameClient = IS_STANDALONE_RUNTIME
  ? createStandaloneRpcClient<PlayerRelayCommands & PlayerRelayEvents>({
      handlers: {
        ...standalonePlayerCommandHandlers,
        ...standalonePlayerEventHandlers,
      },
      defaultContext: { frameId: 0 },
    })
  : createContentRpcClient<PlayerRelayCommands & PlayerRelayEvents>()

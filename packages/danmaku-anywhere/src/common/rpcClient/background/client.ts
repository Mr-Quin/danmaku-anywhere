import { IS_STANDALONE_RUNTIME } from '@/common/environment/isStandalone'
import { createChromeRpcClient } from '@/common/rpc/client'
import type {
  BackgroundMethods,
  PlayerRelayCommands,
  PlayerRelayEvents,
} from '@/common/rpcClient/background/types'
import { createStandaloneRpcClient } from '@/common/standalone/createStandaloneRpcClient'
import {
  standaloneBackgroundHandlers,
  standalonePlayerCommandHandlers,
  standalonePlayerEventHandlers,
} from '@/common/standalone/standaloneHandlers'

export const chromeRpcClient = IS_STANDALONE_RUNTIME
  ? createStandaloneRpcClient<BackgroundMethods>({
      handlers: standaloneBackgroundHandlers,
    })
  : createChromeRpcClient<BackgroundMethods>()

export const playerRpcClient = IS_STANDALONE_RUNTIME
  ? {
      player: createStandaloneRpcClient<PlayerRelayCommands>({
        handlers: standalonePlayerCommandHandlers,
        defaultContext: { frameId: 0 },
      }),
      controller: createStandaloneRpcClient<PlayerRelayEvents>({
        handlers: standalonePlayerEventHandlers,
      }),
    }
  : {
      player: createChromeRpcClient<PlayerRelayCommands>(),
      controller: createChromeRpcClient<PlayerRelayEvents>(),
    }

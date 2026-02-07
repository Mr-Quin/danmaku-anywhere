import { isStandaloneRuntime } from '@/common/environment/isStandalone'
import { createChromeRpcClient } from '@/common/rpc/client'
import type {
  BackgroundMethods,
  PlayerRelayCommands,
  PlayerRelayEvents,
} from '@/common/rpcClient/background/types'
import { createStandaloneRpcClient } from '@/common/rpcClient/mock/createStandaloneRpcClient'
import {
  standaloneBackgroundHandlers,
  standalonePlayerCommandHandlers,
  standalonePlayerEventHandlers,
} from '@/common/rpcClient/mock/standaloneHandlers'

export const chromeRpcClient = isStandaloneRuntime()
  ? createStandaloneRpcClient<BackgroundMethods>({
      handlers: standaloneBackgroundHandlers,
    })
  : createChromeRpcClient<BackgroundMethods>()

export const playerRpcClient = isStandaloneRuntime()
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

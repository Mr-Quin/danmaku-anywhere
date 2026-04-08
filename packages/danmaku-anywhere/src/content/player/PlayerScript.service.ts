import { inject, injectable } from 'inversify'
import { uiContainer } from '@/common/ioc/uiIoc'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { createRpcServer } from '@/common/rpc/server'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import type { PlayerRelayCommands } from '@/common/rpcClient/background/types'
import { getRandomUUID } from '@/common/utils/utils'
import { PlayerCommandHandler } from '@/content/player/PlayerCommandHandler.service'

/**
 * Lightweight bootstrap for the player script.
 *
 * Runs in every frame on every page. Only sets up a minimal RPC listener
 * and performs the playerReady handshake.
 *
 * When the controller sends `start`, this bootstrap disconnects its lite server,
 * creates the heavy {@link PlayerCommandHandler} via the IoC container,
 * and hands off all subsequent command handling.
 */
@injectable('Singleton')
export class PlayerScript {
  private logger: ILogger
  private frameId = -1
  private readonly documentId = getRandomUUID()

  constructor(@inject(LoggerSymbol) logger: ILogger) {
    this.logger = logger.sub('[PlayerScript]')
  }

  setup(frameId: number) {
    this.frameId = frameId
    this.logger = this.logger.sub(`[Player-${frameId}]`)

    this.createLiteServer()
    this.registerUnloadHandler()

    this.logger.debug('Player script listening')
    void this.sendPlayerReady()
  }

  /**
   * Lite RPC server: only handles `controllerReady` (handshake) and
   * `start` (transition trigger). All other commands are ignored
   * until the heavy handler takes over.
   */
  private createLiteServer() {
    const liteServer = createRpcServer<
      Pick<
        PlayerRelayCommands,
        'relay:command:controllerReady' | 'relay:command:start'
      >
    >(
      {
        'relay:command:controllerReady': async () => {
          this.logger.debug('Controller ready, re-sending playerReady')
          void this.sendPlayerReady()
        },
        'relay:command:start': async ({ data: query }) => {
          this.logger.debug('Received start, transitioning to full handler')
          await this.createCommandHandler(query)
          liteServer.unlisten(chrome.runtime.onMessage)
        },
      },
      {
        logger: this.logger,
        context: { frameId: this.frameId },
        filter: (method, data) => {
          if (method === 'relay:command:controllerReady') return true
          if (data.frameId !== this.frameId) return false
          return true
        },
      }
    )

    liteServer.listen(chrome.runtime.onMessage)
  }

  private async createCommandHandler(query: string) {
    const handler = uiContainer.get(PlayerCommandHandler)
    await handler.start({
      frameId: this.frameId,
      query,
      sendPlayerReady: () => void this.sendPlayerReady(),
    })
  }

  private async sendPlayerReady() {
    await playerRpcClient.controller['relay:event:playerReady'](
      {
        frameId: this.frameId,
        data: {
          url: window.location.href,
          documentId: this.documentId,
        },
      },
      { optional: true }
    )
    void playerRpcClient.controller['relay:event:showPopover'](
      { frameId: this.frameId },
      { optional: true }
    )
  }

  private registerUnloadHandler() {
    window.addEventListener('pagehide', (event: PageTransitionEvent) => {
      // Skip BFCache transitions — the page (and this script) will be restored
      if (event.persisted) {
        return
      }

      void playerRpcClient.controller['relay:event:playerUnload'](
        { frameId: this.frameId },
        { optional: true }
      )
    })
  }
}

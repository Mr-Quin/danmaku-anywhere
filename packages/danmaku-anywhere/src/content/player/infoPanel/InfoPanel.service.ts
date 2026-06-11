import { inject, injectable } from 'inversify'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { PanelStateSnapshot } from '@/common/rpcClient/background/types'
import { DanmakuLayoutService } from '@/content/player/danmakuLayout/DanmakuLayout.service'
import { PlayerIdleService } from '@/content/player/idle/PlayerIdle.service'
import { PlayerInfoPanel } from './PlayerInfoPanel'
import { usePanelStateStore } from './panelStateStore'

@injectable('Singleton')
export class InfoPanelService {
  private logger: ILogger
  private mountNode: HTMLDivElement | null = null
  private root: Root | null = null

  constructor(
    @inject(PlayerIdleService) private playerIdle: PlayerIdleService,
    @inject(DanmakuLayoutService) private layout: DanmakuLayoutService,
    @inject(LoggerSymbol) logger: ILogger
  ) {
    this.logger = logger.sub('[InfoPanelService]')
  }

  mount() {
    if (this.mountNode) {
      return
    }
    // Mount into the video-aligned wrapper so the panel positions itself
    // relative to the video rect. The wrapper is pointer-events: none; the
    // panel re-enables pointer events on itself.
    this.mountNode = document.createElement('div')
    this.mountNode.style.position = 'absolute'
    this.mountNode.style.inset = '0'
    this.mountNode.style.pointerEvents = 'none'
    this.layout.wrapper.appendChild(this.mountNode)
    this.root = createRoot(this.mountNode)
    this.root.render(createElement(PlayerInfoPanel))

    usePanelStateStore.getState().setActive(this.playerIdle.getActive())
    this.playerIdle.subscribe((active) => {
      usePanelStateStore.getState().setActive(active)
    })

    this.logger.debug('Info panel mounted')
  }

  setSnapshot(snapshot: PanelStateSnapshot) {
    usePanelStateStore.getState().setSnapshot(snapshot)
  }

  setPipActive(pipActive: boolean) {
    usePanelStateStore.getState().setPipActive(pipActive)
  }
}

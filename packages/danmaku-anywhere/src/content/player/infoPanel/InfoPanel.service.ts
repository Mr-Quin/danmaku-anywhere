import { inject, injectable } from 'inversify'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { PanelStateSnapshot } from '@/common/rpcClient/background/types'
import { PlayerInfoPanel } from './PlayerInfoPanel'
import { usePanelStateStore } from './panelStateStore'

@injectable('Singleton')
export class InfoPanelService {
  private logger: ILogger
  private mountNode: HTMLDivElement | null = null
  private root: Root | null = null

  constructor(@inject(LoggerSymbol) logger: ILogger) {
    this.logger = logger.sub('[InfoPanelService]')
  }

  mount(parent: ShadowRoot | HTMLElement) {
    if (this.mountNode) {
      return
    }
    this.mountNode = document.createElement('div')
    parent.appendChild(this.mountNode)
    this.root = createRoot(this.mountNode)
    this.root.render(createElement(PlayerInfoPanel))
    this.logger.debug('Info panel mounted')
  }

  setSnapshot(snapshot: PanelStateSnapshot) {
    usePanelStateStore.getState().setSnapshot(snapshot)
  }
}

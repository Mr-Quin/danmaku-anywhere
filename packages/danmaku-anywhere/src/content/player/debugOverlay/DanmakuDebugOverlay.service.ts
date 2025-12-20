import type { DanmakuRenderer } from '@danmaku-anywhere/danmaku-engine'
import { inject, injectable } from 'inversify'
import { DanmakuLayoutService } from '../danmakuLayout/DanmakuLayout.service'

@injectable('Singleton')
export class DanmakuDebugOverlayService {
  private readonly DEBUG_PLUGIN_NAME = 'danmaku-stats'

  private isDebugEnabled = false
  private isMounted = false
  private statsNode?: HTMLElement
  private renderer?: DanmakuRenderer

  constructor(
    @inject(DanmakuLayoutService)
    private layoutManager: DanmakuLayoutService
  ) {}

  public attach(renderer: DanmakuRenderer) {
    this.renderer = renderer
  }

  setDebugEnabled(enabled: boolean) {
    this.isDebugEnabled = enabled

    if (enabled) {
      this.addDebugHighlight()
      this.mount()
    } else {
      this.removeDebugHighlight()
      this.unmount()
    }
  }

  private addDebugHighlight() {
    this.layoutManager.wrapper.style.border = '1px solid red'
  }

  private removeDebugHighlight() {
    this.layoutManager.wrapper.style.border = 'none'
  }

  mount() {
    if (this.isMounted) {
      this.unmount()
    }

    if (!this.renderer) return
    const manager = this.renderer.manager
    if (!manager || !this.isDebugEnabled) {
      return
    }

    const stats = document.createElement('div')
    stats.style.position = 'absolute'
    stats.style.top = '0'
    stats.style.left = '0'
    stats.style.background = 'rgba(0, 0, 0, 0.5)'
    stats.style.color = 'white'
    stats.style.fontFamily = 'monospace'
    stats.style.padding = '8px 16px'
    stats.id = 'danmaku-anywhere-manager-stats'

    this.statsNode = stats

    this.layoutManager.wrapper.appendChild(stats)

    const updateDebugStats = (all: number, stash: number, view: number) => {
      stats.innerHTML = `
      <div>All: ${all}</div>
      <div>Stash: ${stash}</div>
      <div>View: ${view}</div>
    `
    }

    const update = () => {
      const { all, view, stash } = manager.len()
      updateDebugStats(all, stash, view)
    }

    // Register plugin to track danmaku changes
    manager.use({
      name: this.DEBUG_PLUGIN_NAME,
      push: () => update(),
      clear: () => update(),
      $destroyed: () => update(),
      $beforeMove: () => update(),
    })

    update()
    this.isMounted = true
  }

  unmount() {
    // Remove plugin from manager
    if (!this.renderer) return
    const manager = this.renderer.manager
    if (manager) {
      manager.remove(this.DEBUG_PLUGIN_NAME)
    }

    // Remove stats node from DOM
    if (this.statsNode) {
      this.statsNode.remove()
      this.statsNode = undefined
    }

    this.isMounted = false
  }
}

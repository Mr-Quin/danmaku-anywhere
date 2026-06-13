import { injectable } from 'inversify'

@injectable('Singleton')
export class DanmakuLayoutService {
  public readonly wrapper: HTMLDivElement
  public readonly container: HTMLDivElement
  // The UI control layer: in-player controls (skip button, info panel) mount
  // here so they share one tier above the danmaku comments (z 9-10) and below
  // the occlusion debug overlay (z 2147483646).
  public readonly uiLayer: HTMLDivElement

  constructor() {
    const wrapper = document.createElement('div')
    wrapper.id = 'danmaku-anywhere-manager-container'
    wrapper.style.position = 'absolute'
    wrapper.style.pointerEvents = 'none'
    wrapper.style.top = '0'
    wrapper.style.left = '0'
    wrapper.style.width = '0' // override later
    wrapper.style.height = '0'
    wrapper.style.overflow = 'hidden'
    wrapper.style.border = 'none'
    wrapper.style.boxSizing = 'border-box'

    const container = document.createElement('div')
    container.style.width = '100%'
    container.style.height = '100%'

    const uiLayer = document.createElement('div')
    uiLayer.id = 'danmaku-anywhere-ui-layer'
    uiLayer.style.position = 'absolute'
    uiLayer.style.inset = '0'
    uiLayer.style.pointerEvents = 'none'
    uiLayer.style.zIndex = '10000'

    wrapper.appendChild(container)
    wrapper.appendChild(uiLayer)

    this.wrapper = wrapper
    this.container = container
    this.uiLayer = uiLayer
  }
}

import type { Mask } from './maskGeometry'

const DEBUG_Z_INDEX = '2147483646'

export interface DebugUpdate {
  rect: DOMRect
  mask: Mask
  sourceSize: { width: number; height: number }
  cycleMs: number
  personFraction: number
}

/**
 * Visible debug overlay (debug mode only): tints the detected person region over
 * the video and prints timing / coverage so the segmentation can be seen and
 * profiled. Owns its own DOM in the host page; removed on stop / debug-off.
 */
export class OcclusionDebugView {
  private readonly root = document.createElement('div')
  private readonly canvas = document.createElement('canvas')
  private readonly label = document.createElement('div')
  private readonly ctx: CanvasRenderingContext2D | null
  private imageData?: ImageData

  constructor() {
    this.root.style.cssText = `position:fixed;z-index:${DEBUG_Z_INDEX};pointer-events:none;outline:1px solid rgba(0,255,128,0.6);`
    this.canvas.style.cssText = 'width:100%;height:100%;display:block;'
    this.label.style.cssText =
      'position:absolute;top:0;left:0;padding:2px 6px;font:11px monospace;color:#0f8;background:rgba(0,0,0,0.6);white-space:pre;'
    this.root.appendChild(this.canvas)
    this.root.appendChild(this.label)
    document.body.appendChild(this.root)
    this.ctx = this.canvas.getContext('2d')
  }

  update(u: DebugUpdate): void {
    this.root.style.left = `${u.rect.left}px`
    this.root.style.top = `${u.rect.top}px`
    this.root.style.width = `${u.rect.width}px`
    this.root.style.height = `${u.rect.height}px`

    const ctx = this.ctx
    if (ctx) {
      if (
        this.canvas.width !== u.mask.width ||
        this.canvas.height !== u.mask.height ||
        !this.imageData
      ) {
        this.canvas.width = u.mask.width
        this.canvas.height = u.mask.height
        this.imageData = ctx.createImageData(u.mask.width, u.mask.height)
      }
      const tint = this.imageData
      for (let i = 0; i < u.mask.data.length; i += 4) {
        // mask alpha 0 => person; tint it green, leave background clear.
        const personHere = u.mask.data[i + 3] === 0
        tint.data[i] = 0
        tint.data[i + 1] = 255
        tint.data[i + 2] = 128
        tint.data[i + 3] = personHere ? 110 : 0
      }
      ctx.putImageData(tint, 0, 0)
    }

    const fps = u.cycleMs > 0 ? 1000 / u.cycleMs : 0
    const coverage = `${Math.round(u.personFraction * 100)}%`
    const detected = u.personFraction < 0.005 ? ' (no person detected)' : ''
    this.label.textContent = `occlusion ${u.cycleMs.toFixed(0)}ms ~${fps.toFixed(0)}fps\nsrc ${u.sourceSize.width}x${u.sourceSize.height} person ${coverage}${detected}`
  }

  showDisabled(message: string): void {
    this.label.textContent = message
  }

  remove(): void {
    this.root.remove()
  }
}

export class VideoSrcObserver {
  private videoNode: HTMLVideoElement
  private currentSrc: string
  private srcChangeListeners: Set<(src: string) => void>
  private observer: MutationObserver

  constructor(videoNode: HTMLVideoElement) {
    this.videoNode = videoNode
    this.currentSrc = videoNode.src
    this.srcChangeListeners = new Set()

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== 'attributes') continue
        const target = mutation.target
        if (!(target instanceof HTMLVideoElement)) continue

        if (this.currentSrc !== target.src) {
          this.srcChangeListeners.forEach((listener) =>
            listener(this.currentSrc)
          )
        }
        this.currentSrc = target.src
      }
    })

    this.observer.observe(videoNode, {
      attributes: true,
      attributeFilter: ['src'],
    })
  }

  get src() {
    return this.currentSrc
  }

  public onSrcChange(callback: (src: string) => void) {
    this.srcChangeListeners.add(callback)
    callback(this.currentSrc)
  }

  public cleanup() {
    this.observer.disconnect()
  }
}

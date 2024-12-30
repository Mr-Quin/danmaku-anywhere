type VideoSrcChangeListener = (src: string, video: HTMLVideoElement) => void

export class VideoSrcObserver {
  private videoNode: HTMLVideoElement
  private currentSrc: string
  private srcChangeListeners: Set<VideoSrcChangeListener>
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
            listener(this.currentSrc, videoNode)
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

  public onSrcChange(listener: VideoSrcChangeListener) {
    this.srcChangeListeners.add(listener)
  }

  public cleanup() {
    this.observer.disconnect()
    this.srcChangeListeners.clear()
  }
}

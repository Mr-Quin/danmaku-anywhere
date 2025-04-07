type VideoSrcChangeListener = (src: string, video: HTMLVideoElement) => void

export class VideoSrcObserver {
  private videoNode: HTMLVideoElement | null = null
  private currentSrc = ''
  private srcChangeListeners: Set<VideoSrcChangeListener>
  private observer: MutationObserver

  constructor() {
    this.srcChangeListeners = new Set()

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== 'attributes') continue
        const target = mutation.target
        if (!(target instanceof HTMLVideoElement)) continue

        if (this.currentSrc !== target.src) {
          this.srcChangeListeners.forEach((listener) => {
            if (this.videoNode) {
              listener(this.currentSrc, this.videoNode)
            }
          })
        }
        this.currentSrc = target.src
      }
    })
  }

  get src() {
    return this.currentSrc
  }

  public onSrcChange(listener: VideoSrcChangeListener) {
    this.srcChangeListeners.add(listener)
  }

  public observe(videoNode: HTMLVideoElement) {
    this.currentSrc = videoNode.src
    this.videoNode = videoNode
    this.observer.observe(videoNode, {
      attributes: true,
      attributeFilter: ['src'],
    })
  }

  public disconnect() {
    this.observer.disconnect()
  }

  public cleanup() {
    this.disconnect()
    this.srcChangeListeners.clear()
  }
}

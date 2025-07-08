import {
  computed,
  type ElementRef,
  Injectable,
  signal,
  untracked,
} from '@angular/core'
import Artplayer from 'artplayer'

export interface VideoPlayerConfig {
  url: string
  poster?: string
  title?: string
  volume?: number
  autoplay?: boolean
  muted?: boolean
}

export interface VideoPlayerState {
  isReady: boolean
  isPlaying: boolean
  isPaused: boolean
  isEnded: boolean
  isVideoReady: boolean
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  isFullscreen: boolean
  isFullscreenWeb: boolean
}

interface VideoPlayerLayer {
  index: number
  name: string
  style: Record<string, string>
  html: HTMLElement
}

@Injectable({
  providedIn: 'root',
})
export class VideoService {
  private layers: VideoPlayerLayer[] = []

  private $player = signal<Artplayer | null>(null)
  private $container = signal<ElementRef<HTMLDivElement> | null>(null)
  private $config = signal<VideoPlayerConfig | null>(null)

  get player() {
    return this.$player.asReadonly()
  }

  private readonly $state = signal<VideoPlayerState>({
    isReady: false,
    isPlaying: false,
    isPaused: false,
    isEnded: false,
    isVideoReady: false,
    currentTime: 0,
    duration: 0,
    volume: 0.7,
    muted: false,
    isFullscreen: false,
    isFullscreenWeb: false,
  })

  readonly $url = computed(() => this.$config()?.url)
  readonly $title = computed(() => this.$config()?.title)

  readonly $isPlayerReady = computed(() => this.$state().isReady)
  readonly $isPlaying = computed(() => this.$state().isPlaying)
  readonly $isPaused = computed(() => this.$state().isPaused)
  readonly $currentTime = computed(() => this.$state().currentTime)
  readonly $duration = computed(() => this.$state().duration)
  readonly $volume = computed(() => this.$state().volume)
  readonly $muted = computed(() => this.$state().muted)
  readonly $isVideoReady = computed(() => this.$state().isVideoReady)
  readonly $isFullscreen = computed(() => this.$state().isFullscreen)
  readonly $isFullscreenWeb = computed(() => this.$state().isFullscreenWeb)

  initialize(
    container: ElementRef<HTMLDivElement>,
    config: VideoPlayerConfig
  ): Artplayer {
    this.$container.set(container)
    this.$config.set(config)

    const player = new Artplayer({
      container: container.nativeElement,
      url: config.url,
      volume: config.volume ?? 0.7,
      isLive: false,
      muted: config.muted ?? false,
      autoplay: config.autoplay ?? true,
      poster: config.poster,
      pip: true,
      autoSize: true,
      autoMini: false,
      screenshot: true,
      setting: true,
      loop: false,
      flip: true,
      playbackRate: true,
      aspectRatio: true,
      fullscreen: true,
      fullscreenWeb: true,
      subtitleOffset: true,
      miniProgressBar: true,
      mutex: true,
      backdrop: true,
      playsInline: true,
      autoPlayback: true,
      airplay: false,
      lang: 'zh-cn',
      theme: '#f472b6',
    })

    this.setupEventListeners(player)
    this.$player.set(player)
    this.updateState({ isReady: true })
    this.layers.forEach((layer) => {
      player.layers.add(layer)
    })

    return player
  }

  updateUrl(url: string): void {
    this.updateConfig({ url })
    this.updateState({ isVideoReady: false })
    const player = untracked(() => this.$player())
    if (player) {
      player.destroy()
      this.initialize(
        // biome-ignore lint/style/noNonNullAssertion: not null since player already exists
        untracked(() => this.$container())!,
        // biome-ignore lint/style/noNonNullAssertion: not null since player already exists
        untracked(() => this.$config())!
      )
    }
  }

  updatePoster(poster: string): void {
    this.updateConfig({ poster })
    const player = this.$player()
    if (player) {
      player.poster = poster
    }
  }

  addLayer(layer: VideoPlayerLayer): void {
    this.layers.push(layer)
    const player = this.$player()
    if (player) {
      player.layers.add(layer)
    }
  }

  removeLayer(name: string): void {
    const player = this.$player()
    if (player) {
      player.layers.remove(name)
    }
  }

  destroy(): void {
    const player = this.$player()
    if (player) {
      player.destroy()
      this.$player.set(null)
      this.$container.set(null)
      this.$config.set(null)
      this.updateState({
        isReady: false,
        isPlaying: false,
        isPaused: false,
        isEnded: false,
        currentTime: 0,
        duration: 0,
        volume: 0.7,
        muted: false,
        isVideoReady: false,
        isFullscreen: false,
        isFullscreenWeb: false,
      })
    }
  }

  private setupEventListeners(player: Artplayer): void {
    // use this to determine if a video is loaded at all
    player.on('video:canplay', () => {
      this.updateState({ isVideoReady: true })
    })

    player.on('video:play', () => {
      this.updateState({ isPlaying: true, isPaused: false })
    })

    player.on('video:pause', () => {
      this.updateState({ isPlaying: false, isPaused: true })
    })

    player.on('video:ended', () => {
      this.updateState({ isEnded: true, isPlaying: false, isPaused: false })
    })

    player.on('video:timeupdate', () => {
      this.updateState({ currentTime: player.currentTime })
    })

    player.on('video:volumechange', () => {
      this.updateState({ volume: player.volume, muted: player.muted })
    })

    player.on('resize', () => {
      const container = this.$container()
      if (container) {
        container.nativeElement.getClientRects()
      }
    })

    player.on('fullscreen', (isFullscreen: boolean) => {
      this.updateState({ isFullscreen })
    })

    player.on('fullscreenWeb', (isFullscreenWeb: boolean) => {
      this.updateState({ isFullscreenWeb })
    })
  }

  private updateConfig(config: Partial<VideoPlayerConfig>): void {
    // might cause infinite loops if not untracked
    this.$config.update((prev) => {
      if (!prev) {
        // noop if no existing config
        return null
      }
      return {
        ...prev,
        ...config,
      }
    })
  }

  private updateState(updates: Partial<VideoPlayerState>) {
    this.$state.update((state) => ({ ...state, ...updates }))
  }
}

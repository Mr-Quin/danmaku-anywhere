import {
  computed,
  type ElementRef,
  Injectable,
  inject,
  signal,
} from '@angular/core'
import Artplayer from 'artplayer'
import { MessageService } from 'primeng/api'
import { serializeError } from '../../shared/utils/serializeError'

interface ComponentOption {
  /**
   * Html string or html element of component
   */
  html?: string | HTMLElement

  /**
   * Whether to disable component
   */
  disable?: boolean

  /**
   * Unique name for component
   */
  name?: string

  /**
   * Component sort index
   */
  index?: number

  /**
   * Component style object
   */
  style?: Partial<CSSStyleDeclaration>

  /**
   * Component click event
   */
  click?: (this: Artplayer, component: any, event: Event) => void

  /**
   * When the component was mounted
   */
  mounted?: (this: Artplayer, element: HTMLElement) => void

  /**
   * When the component was before unmount
   */
  beforeUnmount?: (this: Artplayer, element: HTMLElement) => void

  /**
   * Component tooltip, use in controls
   */
  tooltip?: string

  /**
   * Component position, use in controls
   */
  position?: 'top' | 'left' | 'right' | (string & Record<never, never>)
}

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

const defaultPlayerState = {
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
}

@Injectable({
  providedIn: 'root',
})
export class VideoService {
  private readonly messageService = inject(MessageService)

  private layers: ComponentOption[] = []
  private layerNames = new Set<string>()
  private controls: ComponentOption[] = []
  private controlNames = new Set<string>()

  private $player = signal<Artplayer | null>(null)
  private $container = signal<ElementRef<HTMLDivElement> | null>(null)
  private $config = signal<VideoPlayerConfig | null>(null)

  get player() {
    return this.$player.asReadonly()
  }

  private readonly $state = signal<VideoPlayerState>(defaultPlayerState)

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
    this.controls.forEach((control) => {
      player.controls.add(control)
    })

    return player
  }

  updateUrl(url: string): void {
    this.updateConfig({ url })
    const player = this.$player()
    if (player) {
      if (!url) {
        this.updateState({ isVideoReady: false })
      } else {
        void player.switchUrl(url)
      }
    }
  }

  updatePoster(poster: string): void {
    this.updateConfig({ poster })
    const player = this.$player()
    if (player) {
      player.poster = poster
    }
  }

  addLayer(layer: ComponentOption): void {
    if (layer.name && this.layerNames.has(layer.name)) {
      return
    }
    this.layers.push(layer)
    if (layer.name) {
      this.layerNames.add(layer.name)
    }
    const player = this.$player()
    if (player) {
      player.layers.add(layer)
    }
  }

  addControl(control: ComponentOption): void {
    if (control.name && this.controlNames.has(control.name)) {
      return
    }
    this.controls.push(control)
    if (control.name) {
      this.controlNames.add(control.name)
    }
    const player = this.$player()
    if (player) {
      player.controls.add(control)
    }
  }

  removeControl(name: string): void {
    if (!this.controlNames.has(name)) {
      return
    }
    this.controls = this.controls.filter((c) => c.name !== name)
    this.controlNames.delete(name)
    const player = this.$player()
    if (player) {
      player.controls.remove(name)
    }
  }

  destroy(): void {
    const player = this.$player()
    if (player) {
      player.destroy()
      this.$player.set(null)
      this.$container.set(null)
      this.$config.set(null)
      this.layers = []
      this.controls = []
      this.layerNames.clear()
      this.controlNames.clear()
      this.updateState(defaultPlayerState)
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

    player.on('error', (e: unknown) => {
      this.messageService.add({
        severity: 'error',
        summary: '视频加载错误',
        detail: serializeError(e),
        closable: false,
        life: 3000,
      })
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

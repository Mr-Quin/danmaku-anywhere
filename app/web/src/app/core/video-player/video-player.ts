import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewInit,
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  computed,
  contentChild,
  createComponent,
  type ElementRef,
  EnvironmentInjector,
  effect,
  inject,
  input,
  type OnDestroy,
  output,
  signal,
  type TemplateRef,
  viewChild,
} from '@angular/core'
import type Artplayer from 'artplayer'
import { SubtitleButton } from './components/subtitle-button'
import {
  type SubtitleTrack,
  type VideoPlayerConfig,
  VideoService,
} from './video.service'
import { NEXT_EPISODE_ICON, PREV_EPISODE_ICON } from './video-icon.const'

@Component({
  selector: 'da-video-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  host: {
    '[class.hide-art-loading]': 'showOverlay()',
  },
  // hide artplayer's default loader and add title animations
  styles: `
      :host(.hide-art-loading) {
          ::ng-deep .art-loading {
              display: none;
          }
      }

      :host {
          ::ng-deep .art-poster {
              opacity: 40%;
          }
      }

      .title-container {
          transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
          opacity: 0;
          transform: translateY(-10px);
      }

      .title-container.show {
          opacity: 1;
          transform: translateY(0);
      }

      .title-container.hide {
          opacity: 0;
          transform: translateY(-10px);
      }
  `,
  template: `
    <div class="bg-black w-full aspect-video relative"
         (mouseenter)="onMouseEnter()"
         (mouseleave)="onMouseLeave()"
         (mousemove)="onMouseMove()">
      <div #artPlayer class="w-full h-full absolute"></div>
    </div>
    <div #overlayLayer class="size-full">
      @if ($showLoadingOverlay() && $contentTemplate(); as template) {
        <ng-container *ngTemplateOutlet="template"></ng-container>
      }
    </div>
    <div #titleLayer class="absolute top-0 left-0 w-full p-4 pointer-events-none">
      @if (title()) {
        <div class="title-container" [class.show]="$showTitle()" [class.hide]="!$showTitle()">
          <div class="bg-black/70 text-white px-4 py-2 rounded-lg inline-block backdrop-blur-sm">
            <h2 class="text-lg font-semibold">{{ title() }}</h2>
          </div>
        </div>
      }
    </div>
  `,
})
export class VideoPlayer implements AfterViewInit, OnDestroy {
  private readonly videoService = inject(VideoService)
  private readonly envInjector = inject(EnvironmentInjector)
  private readonly appRef = inject(ApplicationRef)

  private subtitleButtonRef: ComponentRef<SubtitleButton> | null = null

  $artPlayerDiv = viewChild.required<ElementRef<HTMLDivElement>>('artPlayer')
  $overlayLayer = viewChild.required<ElementRef<HTMLDivElement>>('overlayLayer')
  $titleLayer = viewChild.required<ElementRef<HTMLDivElement>>('titleLayer')

  $contentTemplate = contentChild<TemplateRef<unknown>>('content')

  videoUrl = input<string>()
  poster = input<string>()
  title = input<string>()
  subtitleTracks = input<SubtitleTrack[]>([])
  subtitleLoading = input<boolean>(false)
  showOverlay = input<boolean>(false)
  hasPrevious = input<boolean>(false)
  hasNext = input<boolean>(false)

  previousEpisode = output<void>()
  nextEpisode = output<void>()
  clickPlay = output<void>()

  private $isHovering = signal(false)
  private $shouldShowTitle = signal(false)
  private hideTimer: ReturnType<typeof setTimeout> | null = null
  private mouseMoveTimer: ReturnType<typeof setTimeout> | null = null

  protected $showLoadingOverlay = computed(() => {
    if (this.videoService.$isVideoReady()) {
      return false
    }
    return this.showOverlay()
  })

  protected $showTitle = computed(() => {
    const isFullscreen =
      this.videoService.$isFullscreen() || this.videoService.$isFullscreenWeb()
    const shouldShow = this.$shouldShowTitle()
    const hasTitle = !!this.title()
    return (
      isFullscreen &&
      shouldShow &&
      hasTitle &&
      this.videoService.$isVideoReady()
    )
  })

  constructor() {
    // update video url separately
    effect(() => {
      const url = this.videoUrl()
      if (url !== undefined) {
        this.videoService.updateUrl(url)
      }
    })

    // update poster separately
    effect(() => {
      const poster = this.poster()
      if (poster !== undefined) {
        this.videoService.updatePoster(poster)
      }
    })

    // update subtitles
    effect(() => {
      const tracks = this.subtitleTracks()
      const loading = this.subtitleLoading()
      this.videoService.setSubtitleTracks(tracks)
      this.videoService.setSubtitleLoading(loading)

      if (!loading && tracks.length > 0) {
        this.videoService.switchSubtitle(tracks[0])
      }
    })

    // update controls
    effect(() => {
      if (this.hasPrevious()) {
        this.addPreviousEpisodeControl()
      } else {
        this.removePreviousEpisodeControl()
      }
    })
    effect(() => {
      if (this.hasNext()) {
        this.addNextEpisodeControl()
      } else {
        this.removeNextEpisodeControl()
      }
    })
  }

  ngAfterViewInit() {
    this.initializePlayer()
    this.setupMediaSession()
    this.updateSubtitleControl()
  }

  ngOnDestroy() {
    this.clearTimers()
    this.clearMediaSession()
    if (this.subtitleButtonRef) {
      this.appRef.detachView(this.subtitleButtonRef.hostView)
      this.subtitleButtonRef.destroy()
      this.subtitleButtonRef = null
    }
    this.videoService.destroy()
  }

  protected onMouseEnter() {
    this.$isHovering.set(true)
    this.clearTimers()
    this.$shouldShowTitle.set(true)
  }

  protected onMouseLeave() {
    this.$isHovering.set(false)
    this.startHideTimer()
  }

  protected onMouseMove() {
    this.clearMouseMoveTimer()

    if (this.$isHovering() && this.title()) {
      this.$shouldShowTitle.set(true)
    }

    this.startMouseMoveTimer()
  }

  private startHideTimer() {
    this.clearTimers()
    this.hideTimer = setTimeout(() => {
      this.$shouldShowTitle.set(false)
    }, 3000)
  }

  private startMouseMoveTimer() {
    this.mouseMoveTimer = setTimeout(() => {
      this.$shouldShowTitle.set(false)
    }, 3000)
  }

  private clearTimers() {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
    this.clearMouseMoveTimer()
  }

  private clearMouseMoveTimer() {
    if (this.mouseMoveTimer) {
      clearTimeout(this.mouseMoveTimer)
      this.mouseMoveTimer = null
    }
  }

  private setupMediaSession() {
    if (!('mediaSession' in navigator)) {
      return
    }

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      if (this.hasPrevious()) {
        this.previousEpisode.emit()
      }
    })

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      if (this.hasNext()) {
        this.nextEpisode.emit()
      }
    })
  }

  private clearMediaSession() {
    if (!('mediaSession' in navigator)) {
      return
    }

    navigator.mediaSession.setActionHandler('previoustrack', null)
    navigator.mediaSession.setActionHandler('nexttrack', null)
  }

  private addOverlayLayer() {
    const overlayLayer = this.$overlayLayer()
    this.videoService.addLayer({
      index: 0,
      name: 'overlay',
      style: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      },
      html: overlayLayer.nativeElement,
    })
  }

  private addTitleLayer() {
    const titleLayer = this.$titleLayer()
    this.videoService.addLayer({
      index: 10,
      name: 'title',
      style: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      },
      html: titleLayer.nativeElement,
    })
  }

  private addPreviousEpisodeControl() {
    this.videoService.addControl({
      index: 9,
      name: 'previous-episode',
      position: 'left',
      html: PREV_EPISODE_ICON,
      tooltip: '上一集',
      click: () => {
        this.previousEpisode.emit()
      },
    })
  }

  private removePreviousEpisodeControl() {
    this.videoService.removeControl('previous-episode')
  }

  private addNextEpisodeControl() {
    this.videoService.addControl({
      index: 11,
      name: 'next-episode',
      position: 'left',
      html: NEXT_EPISODE_ICON,
      tooltip: '下一集',
      click: () => {
        this.nextEpisode.emit()
      },
    })
  }

  private removeNextEpisodeControl() {
    this.videoService.removeControl('next-episode')
  }

  private getOrCreateSubtitleButton(
    player: Artplayer
  ): ComponentRef<SubtitleButton> {
    if (!this.subtitleButtonRef) {
      this.subtitleButtonRef = createComponent(SubtitleButton, {
        environmentInjector: this.envInjector,
      })
      this.subtitleButtonRef.setInput('player', player)
      this.appRef.attachView(this.subtitleButtonRef.hostView)
      this.subtitleButtonRef.changeDetectorRef.detectChanges()
    }
    return this.subtitleButtonRef
  }

  private updateSubtitleControl() {
    const player = this.videoService.player()
    if (!player) {
      return
    }
    this.getOrCreateSubtitleButton(player)
  }

  private initializePlayer() {
    const url = this.videoUrl() ?? ''
    const poster = this.poster()
    const title = this.title()

    const config: VideoPlayerConfig = {
      url,
      poster,
      title,
    }

    this.videoService.initialize(this.$artPlayerDiv(), config)
    this.addTitleLayer()
    this.addOverlayLayer()
    this.addPreviousEpisodeControl()
    this.removePreviousEpisodeControl()
  }
}

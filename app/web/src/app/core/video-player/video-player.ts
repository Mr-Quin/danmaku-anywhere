import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  type ElementRef,
  effect,
  inject,
  input,
  type OnDestroy,
  output,
  signal,
  type TemplateRef,
  viewChild,
} from '@angular/core'
import { type VideoPlayerConfig, VideoService } from './video.service'

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

  $artPlayerDiv = viewChild.required<ElementRef<HTMLDivElement>>('artPlayer')
  $overlayLayer = viewChild.required<ElementRef<HTMLDivElement>>('overlayLayer')
  $titleLayer = viewChild.required<ElementRef<HTMLDivElement>>('titleLayer')

  $contentTemplate = contentChild<TemplateRef<unknown>>('content')

  videoUrl = input<string>()
  poster = input<string>()
  title = input<string>()
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
  }

  ngOnDestroy() {
    this.clearTimers()
    this.clearMediaSession()
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
      html: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" fill="currentColor"/></svg>',
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
      html: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 18h2V6h-2zm-3.5-6L4 6v12z" fill="currentColor"/></svg>',
      tooltip: '下一集',
      click: () => {
        this.nextEpisode.emit()
      },
    })
  }

  private removeNextEpisodeControl() {
    this.videoService.removeControl('next-episode')
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

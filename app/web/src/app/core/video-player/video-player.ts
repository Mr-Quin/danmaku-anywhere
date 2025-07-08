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
  // hide artplayer's default loader
  styles: `
      :host(.hide-art-loading) {
          ::ng-deep .art-loading {
              display: none;
          }
      }
  `,
  template: `
    <div class="bg-black w-full aspect-video relative"
         (mouseenter)="onMouseEnter()"
         (mouseleave)="onMouseLeave()">
      <div #artPlayer class="w-full h-full absolute"></div>
    </div>
    <div #overlayLayer class="size-full">
      @if ($showLoadingOverlay() && $contentTemplate(); as template) {
        <ng-container *ngTemplateOutlet="template"></ng-container>
      }
    </div>
    <div #titleLayer class="absolute top-0 left-0 w-full p-4 pointer-events-none">
      @if ($showTitle() && title()) {
        <div class="bg-black/50 text-white px-4 py-2 rounded-lg inline-block">
          <h2 class="text-lg font-semibold">{{ title() }}</h2>
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

  private $isHovering = signal(false)

  protected $showLoadingOverlay = computed(() => {
    return !this.videoService.$isVideoReady() || this.showOverlay()
  })

  protected $showTitle = computed(() => {
    const isFullscreen =
      this.videoService.$isFullscreen() || this.videoService.$isFullscreenWeb()
    const isHovering = this.$isHovering()
    const hasTitle = !!this.title()
    return (
      isFullscreen &&
      isHovering &&
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
  }

  ngAfterViewInit() {
    this.initializePlayer()
  }

  ngOnDestroy() {
    this.videoService.destroy()
  }

  protected onMouseEnter() {
    this.$isHovering.set(true)
  }

  protected onMouseLeave() {
    this.$isHovering.set(false)
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
  }
}

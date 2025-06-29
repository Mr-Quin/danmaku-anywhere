import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  type ElementRef,
  effect,
  input,
  type OnDestroy,
  signal,
  type TemplateRef,
  viewChild,
} from '@angular/core'
import Artplayer from 'artplayer'

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
    <div class="bg-black w-full aspect-video relative">
      <div #artPlayer class="w-full h-full absolute"></div>
    </div>
    <div #overlay class="size-full">
      @if ($showLoadingOverlay() && $contentTemplate(); as template) {
        <ng-container *ngTemplateOutlet="template"></ng-container>
      }
    </div>
  `,
})
export class VideoPlayer implements AfterViewInit, OnDestroy {
  $artPlayerDiv = viewChild.required<ElementRef<HTMLDivElement>>('artPlayer')
  $overlayLayer = viewChild.required<ElementRef<HTMLDivElement>>('overlay')

  $contentTemplate = contentChild<TemplateRef<any>>('content')

  videoUrl = input<string>()
  poster = input<string>()
  title = input<string>()
  showOverlay = input<boolean>(false)

  protected $loadedMetadata = signal(false)
  protected $showLoadingOverlay = computed(() => {
    return !this.$loadedMetadata() && this.showOverlay()
  })

  protected $isVideoReady = signal(false)

  private $player = signal<Artplayer | null>(null)

  // update player url
  #_ = effect(() => {
    const url = this.videoUrl()
    const player = this.$player()
    if (player) {
      player.url = url ?? ''
    }
  })

  // add overlay layer to player
  #__ = effect(() => {
    const layer = this.$overlayLayer()
    const player = this.$player()
    if (player) {
      player.layers.add({
        index: 0,
        name: 'overlay',
        style: {
          position: 'absolute',
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        },
        html: layer.nativeElement,
      })
    }
  })

  ngAfterViewInit() {
    this.initializePlayer()
  }

  ngOnDestroy() {
    this.destroyPlayer()
  }

  private initializePlayer() {
    const url = this.videoUrl() ?? ''

    const player = new Artplayer({
      container: this.$artPlayerDiv().nativeElement,
      url,
      volume: 0.7,
      isLive: false,
      muted: false,
      autoplay: true,
      pip: true,
      autoSize: true,
      autoMini: true,
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
      ...(this.poster() ? { poster: this.poster() } : {}),
    })

    player.on('video:loadedmetadata', () => {
      this.$loadedMetadata.set(true)
      console.log('loaded metadata')
    })

    player.on('resize', () => {
      this.$artPlayerDiv().nativeElement.getClientRects()
    })

    this.$player.set(player)
    this.$isVideoReady.set(true)
  }

  private destroyPlayer() {
    const player = this.$player()
    if (player) {
      player.destroy()
      this.$player.set(null)
      this.$isVideoReady.set(false)
    }
  }
}

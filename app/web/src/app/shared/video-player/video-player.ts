import { NgTemplateOutlet } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
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
  template: `
    <div #artPlayer class="bg-black w-full aspect-video">
      @if (!$isVideoReady()) {
        @if (contentTemplate(); as template) {
          <ng-container *ngTemplateOutlet="template"></ng-container>
        }
      }
    </div>
  `,
})
export class VideoPlayer implements OnDestroy {
  artPlayerDiv = viewChild.required<ElementRef<HTMLDivElement>>('artPlayer')
  contentTemplate = contentChild<TemplateRef<any>>('content')

  videoUrl = input<string>()
  poster = input<string>()
  title = input<string>()

  protected $isVideoReady = signal(false)

  private player: Artplayer | null = null

  #_ = effect(() => {
    const url = this.videoUrl()
    console.log({ url })
    if (url) {
      this.initializePlayer()
    } else {
      this.destroyPlayer()
    }
  })

  ngOnDestroy() {
    this.destroyPlayer()
  }

  private initializePlayer() {
    const url = this.videoUrl()

    if (!url) return

    this.player = new Artplayer({
      container: this.artPlayerDiv().nativeElement,
      url,
      volume: 0.5,
      isLive: false,
      muted: false,
      autoplay: false,
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
      airplay: true,
      ...(this.poster() ? { poster: this.poster() } : {}),
    })
    this.$isVideoReady.set(true)
  }

  private destroyPlayer() {
    if (this.player) {
      this.player.destroy()
      this.player = null
      this.$isVideoReady.set(false)
    }
  }
}

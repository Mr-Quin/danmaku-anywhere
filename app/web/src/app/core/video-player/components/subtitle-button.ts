import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  type OnDestroy,
  type OnInit,
  signal,
} from '@angular/core'
import type Artplayer from 'artplayer'
import { type SubtitleTrack, VideoService } from '../video.service'

@Component({
  selector: 'da-subtitle-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      width: 36px;
      height: 36px;
      cursor: pointer;
    }

    .icon-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .spinner {
      position: absolute;
      width: 22px;
      height: 22px;
      border: 2px solid transparent;
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .icon-wrapper.loading svg {
      opacity: 0.3;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .tooltip {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-bottom: 8px;
      padding: 4px 8px;
      background: rgba(0, 0, 0, 0.8);
      color: #fff;
      font-size: 12px;
      border-radius: 4px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s;
    }

    :host(:hover) .tooltip {
      opacity: 1;
    }

    .menu {
      position: absolute;
      bottom: 100%;
      right: 0;
      margin-bottom: 12px;
      background: rgba(0, 0, 0, 0.9);
      border-radius: 6px;
      padding: 4px 0;
      min-width: 120px;
      max-height: 200px;
      overflow-y: auto;
      backdrop-filter: blur(8px);
    }

    .menu-item {
      display: block;
      width: 100%;
      padding: 6px 16px;
      color: #fff;
      font-size: 13px;
      cursor: pointer;
      white-space: nowrap;
      text-align: left;
      background: none;
      border: none;
      transition: background 0.15s;
    }

    .menu-item:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .menu-item.active {
      color: var(--art-theme, #f472b6);
    }
  `,
  template: `
    <div class="icon-wrapper" [class.loading]="$isLoading()" (click)="toggleMenu($event)">
      @if ($isLoading()) {
        <div class="spinner"></div>
      }
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h2v2H6zm0 4h8v2H6zm10 0h2v2h-2zm-6-4h8v2h-8z" fill="currentColor"/>
      </svg>
    </div>

    @if (!$menuOpen()) {
      <div class="tooltip">字幕</div>
    }

    @if ($menuOpen()) {
      <div class="menu">
        <button
          class="menu-item"
          [class.active]="!$activeTrack()"
          (click)="selectOff($event)"
        >
          关闭
        </button>
        @for (track of $tracks(); track track.name) {
          <button
            class="menu-item"
            [class.active]="$activeTrack()?.name === track.name"
            (click)="selectTrack(track, $event)"
          >
            {{ track.name }}
          </button>
        }
      </div>
    }
  `,
})
export class SubtitleButton implements OnInit, OnDestroy {
  readonly player = input.required<Artplayer>()
  readonly videoService = inject(VideoService)

  private readonly elementRef = inject(ElementRef<HTMLElement>)

  private readonly controlName = 'subtitle'
  private registered = false

  protected readonly $isLoading = this.videoService.$subtitleLoading
  protected readonly $tracks = this.videoService.$subtitleTracks
  protected readonly $activeTrack = this.videoService.$activeSubtitleTrack
  protected readonly $menuOpen = signal(false)

  protected readonly $canOpen = computed(() => {
    return !this.$isLoading() && this.$tracks().length > 0
  })

  private readonly outsideClickHandler = (e: MouseEvent) => {
    if (!this.elementRef.nativeElement.contains(e.target as Node)) {
      this.$menuOpen.set(false)
    }
  }

  ngOnInit(): void {
    this.player().controls.add({
      name: this.controlName,
      position: 'right',
      index: 20,
      html: this.elementRef.nativeElement,
    })
    this.registered = true
    document.addEventListener('click', this.outsideClickHandler, true)
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.outsideClickHandler, true)
    if (this.registered) {
      this.player().controls.remove(this.controlName)
      this.registered = false
    }
  }

  toggleMenu(event: Event) {
    event.stopPropagation()
    if (!this.$canOpen()) {
      return
    }
    this.$menuOpen.update((v) => !v)
  }

  selectTrack(track: SubtitleTrack, event: Event) {
    event.stopPropagation()
    this.videoService.switchSubtitle(track)
    this.$menuOpen.set(false)
  }

  selectOff(event: Event) {
    event.stopPropagation()
    this.videoService.clearSubtitle()
    this.$menuOpen.set(false)
  }
}

import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Button } from 'primeng/button'
import { Card } from 'primeng/card'
import { Panel } from 'primeng/panel'
import { ProgressSpinner } from 'primeng/progressspinner'
import { ScrollPanel } from 'primeng/scrollpanel'
import { Select } from 'primeng/select'
import { VideoService } from '../../../core/video-player/video.service'
import { VideoPlayer } from '../../../core/video-player/video-player'

interface DebugEpisode {
  name: string
  url: string
  poster?: string
}

interface DebugVideoSource {
  name: string
  episodes: DebugEpisode[]
}

@Component({
  selector: 'da-video-debug-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    Button,
    FormsModule,
    Select,
    VideoPlayer,
    ScrollPanel,
    Card,
    Panel,
    ProgressSpinner,
  ],
  template: `
    @let selectedEpisode = $selectedEpisode();
    <div class="container mx-auto p-6 2xl:px-0 flex flex-col">
      <div class="mb-10 flex">
        <div class="flex flex-1 items-center gap-2">
          <h1 class="text-2xl font-semibold">
            视频播放器调试页面
            @if (selectedEpisode) {
              <span> - {{ selectedEpisode.name }}</span>
            }
          </h1>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-[1fr_424px] gap-8">
        <da-video-player
          [videoUrl]="$videoUrl()"
          [title]="selectedEpisode?.name || ''"
          [poster]="selectedEpisode?.poster || ''"
          [showOverlay]="$showOverlay() || $isLoading()"
          [hasPrevious]="$hasPrevious()"
          [hasNext]="$hasNext()"
          (previousEpisode)="onPreviousEpisode()"
          (nextEpisode)="onNextEpisode()"
        >
          <ng-template #content>
            <div class="size-full flex flex-col justify-center items-center gap-4">
              @if ($isLoading()) {
                <div class="text-center">
                  <p-progress-spinner styleClass="w-16 h-16" />
                  <p class="mt-4">正在加载视频...</p>
                  <p class="text-sm text-gray-500">模拟加载延迟: {{ $loadingTimeout() }}ms</p>
                </div>
              } @else if (!selectedEpisode) {
                <p>请选择一个视频测试</p>
              }
            </div>
          </ng-template>
        </da-video-player>

        <div class="flex flex-col gap-4">
          <!-- Debug Controls -->
          <p-panel header="调试控制" toggleable="true" styleClass="border-0">
            <div class="grid grid-cols-2 gap-2">
              <p-button
                label="强制覆盖层"
                (onClick)="$showOverlay.set(true)"
                size="small"
              />
              <p-button
                label="隐藏覆盖层"
                (onClick)="$showOverlay.set(false)"
                size="small"
              />
              <p-button
                label="播放"
                (onClick)="playVideo()"
                size="small"
              />
              <p-button
                label="暂停"
                (onClick)="pauseVideo()"
                size="small"
              />
              <p-button
                label="重置视频"
                (onClick)="resetVideo()"
                size="small"
              />
              <p-button
                label="清除视频"
                (onClick)="clearVideo()"
                size="small"
              />
              <p-button
                label="模拟加载"
                (onClick)="simulateLoading()"
                size="small"
                severity="info"
              />
              <p-button
                label="停止加载"
                (onClick)="$isLoading.set(false)"
                size="small"
                severity="secondary"
              />
              <p-button
                label="上一集"
                (onClick)="onPreviousEpisode()"
                size="small"
                severity="help"
                [disabled]="!$hasPrevious()"
              />
              <p-button
                label="下一集"
                (onClick)="onNextEpisode()"
                size="small"
                severity="help"
                [disabled]="!$hasNext()"
              />
            </div>
            <div class="mt-4 mb-4">
              <label class="block text-sm font-medium mb-2">加载延迟 (ms)</label>
              <div class="flex gap-2">
                <p-button
                  label="1s"
                  (onClick)="$loadingTimeout.set(1000)"
                  size="small"
                  [outlined]="$loadingTimeout() !== 1000"
                />
                <p-button
                  label="2s"
                  (onClick)="$loadingTimeout.set(2000)"
                  size="small"
                  [outlined]="$loadingTimeout() !== 2000"
                />
                <p-button
                  label="5s"
                  (onClick)="$loadingTimeout.set(5000)"
                  size="small"
                  [outlined]="$loadingTimeout() !== 5000"
                />
              </div>
            </div>
            <div class="mt-4 p-3 rounded">
              <h4 class="font-semibold mb-2">播放器状态</h4>
              <div class="grid grid-cols-2 gap-2 text-sm">
                <div>播放器就绪: {{ videoService.$isPlayerReady() ? '✓' : '✗' }}</div>
                <div>视频就绪: {{ videoService.$isVideoReady() ? '✓' : '✗' }}</div>
                <div>播放中: {{ videoService.$isPlaying() ? '✓' : '✗' }}</div>
                <div>暂停: {{ videoService.$isPaused() ? '✓' : '✗' }}</div>
                <div>音量: {{ videoService.$volume() }}</div>
                <div>静音: {{ videoService.$muted() ? '✓' : '✗' }}</div>
                <div>加载中: {{ $isLoading() ? '✓' : '✗' }}</div>
                <div>覆盖层: {{ $showOverlay() ? '✓' : '✗' }}</div>
                <div>当前集数: {{ $currentEpisodeIndex() + 1 }}/{{ $episodes().length }}</div>
                <div>有上一集: {{ $hasPrevious() ? '✓' : '✗' }}</div>
                <div>有下一集: {{ $hasNext() ? '✓' : '✗' }}</div>
              </div>
            </div>
          </p-panel>

          <!-- Video Selection -->
          <p-card>
            <div class="max-h-72 xl:h-max xl:w-[24rem]">
              <p-select
                [options]="$sourceOptions()"
                [(ngModel)]="$selectedSource"
                optionLabel="name"
                optionValue="name"
                placeholder="选择视频源"
                class="mb-4"
              />
              <p-scroll-panel [style]="{height: '100%'}">
                <div class="max-xl:flex max-xl:flex-wrap xl:grid xl:grid-cols-2 gap-2">
                  @for (episode of $episodes(); track episode.url) {
                    @let isSelected = episode === selectedEpisode;
                    @let isLoading = $isLoading() && !selectedEpisode;
                    <div
                      class="p-4 p-button p-button-secondary transition-all hover:border-primary hover:border cursor-pointer"
                      [class.border-primary]="isSelected"
                      [class.opacity-50]="isLoading"
                      [class.pointer-events-none]="isLoading"
                      (click)="onEpisodeClick(episode)"
                    >
                      <div class="flex-1 flex items-center gap-2">
                        <p
                          class="font-medium flex-1 text-sm"
                          [class.text-primary]="isSelected"
                        >
                          {{ episode.name }}
                        </p>
                        @if (isLoading) {
                          <p-progress-spinner styleClass="w-4 h-4" />
                        }
                      </div>
                    </div>
                  }
                </div>
              </p-scroll-panel>
            </div>
          </p-card>
        </div>
      </div>
    </div>
  `,
})
export class VideoDebugPage {
  protected videoService = inject(VideoService)

  protected $showOverlay = signal(true)
  protected $selectedEpisode = signal<DebugEpisode | null>(null)
  protected $videoUrl = signal<string>('')
  protected $selectedSource = signal<string>('列表1')
  protected $isLoading = signal(false)
  protected $loadingTimeout = signal<number>(2000) // 2 seconds default

  // Hardcoded video sources using publicly available videos
  protected readonly debugSources: DebugVideoSource[] = [
    {
      name: '列表1',
      episodes: [
        {
          name: '样本视频 1',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          poster:
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg',
        },
        {
          name: '样本视频 2',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
          poster:
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg',
        },
        {
          name: '样本视频 3',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          poster:
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg',
        },
      ],
    },
    {
      name: '列表2',
      episodes: [
        {
          name: '视频 1',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
          poster:
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerJoyrides.jpg',
        },
        {
          name: '视频 2',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
          poster:
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg',
        },
        {
          name: '视频 3',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
          poster:
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/TearsOfSteel.jpg',
        },
      ],
    },
  ]

  protected $sourceOptions = computed(() =>
    this.debugSources.map((source) => ({ name: source.name }))
  )

  protected $episodes = computed(() => {
    const sourceName = this.$selectedSource()
    const source = this.debugSources.find((s) => s.name === sourceName)
    return source?.episodes || []
  })

  protected $currentEpisodeIndex = computed(() => {
    const selectedEpisode = this.$selectedEpisode()
    const episodes = this.$episodes()
    if (!selectedEpisode) return -1
    return episodes.findIndex((ep) => ep.url === selectedEpisode.url)
  })

  protected $hasPrevious = computed(() => {
    const currentIndex = this.$currentEpisodeIndex()
    return currentIndex > 0
  })

  protected $hasNext = computed(() => {
    const currentIndex = this.$currentEpisodeIndex()
    const episodes = this.$episodes()
    return currentIndex >= 0 && currentIndex < episodes.length - 1
  })

  protected onEpisodeClick(episode: DebugEpisode) {
    // Simulate async loading behavior
    this.$isLoading.set(true)
    this.$selectedEpisode.set(episode)
    this.$videoUrl.set('') // Clear current video

    setTimeout(() => {
      this.$videoUrl.set(episode.url)
      this.$isLoading.set(false)
    }, this.$loadingTimeout())
  }

  protected onPreviousEpisode() {
    const currentIndex = this.$currentEpisodeIndex()
    const episodes = this.$episodes()
    if (currentIndex > 0) {
      const previousEpisode = episodes[currentIndex - 1]
      this.onEpisodeClick(previousEpisode)
    }
  }

  protected onNextEpisode() {
    const currentIndex = this.$currentEpisodeIndex()
    const episodes = this.$episodes()
    if (currentIndex >= 0 && currentIndex < episodes.length - 1) {
      const nextEpisode = episodes[currentIndex + 1]
      this.onEpisodeClick(nextEpisode)
    }
  }

  protected playVideo() {
    const player = this.videoService.player()
    if (player) {
      player.play()
    }
  }

  protected pauseVideo() {
    const player = this.videoService.player()
    if (player) {
      player.pause()
    }
  }

  protected resetVideo() {
    const player = this.videoService.player()
    if (player) {
      player.currentTime = 0
      player.play()
    }
  }

  protected clearVideo() {
    this.$selectedEpisode.set(null)
    this.$videoUrl.set('')
  }

  protected simulateLoading() {
    this.$isLoading.set(true)
    setTimeout(() => {
      this.$isLoading.set(false)
    }, this.$loadingTimeout())
  }
}

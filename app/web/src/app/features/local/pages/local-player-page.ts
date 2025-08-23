import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core'
import { Title } from '@angular/platform-browser'
import { ProgressSpinner } from 'primeng/progressspinner'
import { VideoPlayer } from '../../../core/video-player/video-player'
import { LocalFolderSelectorComponent } from './components/local-folder-selector.component'
import { LocalPlayerService } from './services/local-player.service'

@Component({
  selector: 'da-local-player-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ProgressSpinner,
    VideoPlayer,
    LocalFolderSelectorComponent,
  ],
  template: `
    <div class="container mx-auto p-6 2xl:px-0 flex flex-col">
      <div class="mb-10 flex items-center gap-3">
        <h1 class="text-2xl font-semibold" id="local-title">{{ $pageTitle() }}</h1>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-[1fr_424px] gap-8">
        <da-video-player
          [videoUrl]="$videoUrl()"
          [title]="$nodeInfo()?.name"
          [poster]="''"
          [showOverlay]="$showOverlay()"
          [hasPrevious]="$nodeInfo()?.hasPrev ?? false"
          [hasNext]="$nodeInfo()?.hasNext ?? false"
          (previousEpisode)="onPrevious()"
          (nextEpisode)="onNext()"
        >
          <ng-template #content>
            <div class="size-full flex flex-col justify-center items-center">
              @if ($isLoading()) {
                <p-progress-spinner />
                <p>正在加载视频...</p>
              } @else if (!$hasSelection()) {
                <p>
                  请选择一个视频文件
                </p>
              }
            </div>
          </ng-template>
        </da-video-player>

        <div class="flex flex-col gap-4">
          <da-local-folder-selector
          />
        </div>
      </div>
    </div>
  `,
})
export class LocalPlayerPage {
  private titleService = inject(Title)
  private localPlayerService = inject(LocalPlayerService)

  protected $videoUrl = this.localPlayerService.$videoUrl
  protected $isLoading = this.localPlayerService.$isLoading
  protected $error = this.localPlayerService.$error
  protected $hasSelection = this.localPlayerService.$hasSelection
  protected $showOverlay = this.localPlayerService.$showOverlay
  protected $nodeInfo = this.localPlayerService.$nodeInfo

  protected $pageTitle = computed(() => {
    const nodeInfo = this.$nodeInfo()
    return nodeInfo ? nodeInfo.name : '本地视频'
  })

  constructor() {
    effect(() => {
      const currentTitle = this.$pageTitle()
      const pageTitle = currentTitle
        ? `${currentTitle} | Danmaku Anywhere`
        : 'Danmaku Anywhere'
      this.titleService.setTitle(pageTitle)
    })
  }

  protected onPrevious() {
    void this.localPlayerService.onPrevious()
  }

  protected onNext() {
    void this.localPlayerService.onNext()
  }
}

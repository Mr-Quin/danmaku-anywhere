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
import type { LocalVideoFileEntry } from './util/filesystem'

type FileSystemDirectoryHandleLike = FileSystemDirectoryHandle
type FileSystemFileHandleLike = FileSystemFileHandle

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
        <h1 class="text-2xl font-semibold">{{ $pageTitle() }}</h1>
        @if ($directoryName()) {
          <span class="text-sm text-surface-400">{{ $directoryName() }}</span>
        }
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-[1fr_424px] gap-8">
        <da-video-player
          [videoUrl]="$videoUrl()"
          [title]="$title()"
          [poster]="''"
          [showOverlay]="$showOverlay()"
          [hasPrevious]="$hasPrevious()"
          [hasNext]="$hasNext()"
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
                  @if (!$directoryHandle()) {
                    请选择一个包含视频文件的文件夹
                  } @else {
                    请选择一个视频文件
                  }
                </p>
              }
            </div>
          </ng-template>
        </da-video-player>

        <div class="flex flex-col gap-4">
          <da-local-folder-selector
            (directorySelected)="onDirectorySelected($event)"
            (filesChanged)="onFilesChanged($event)"
            (fileSelected)="onFileHandleSelected($event)"
          />
        </div>
      </div>
    </div>
  `,
})
export class LocalPlayerPage {
  private titleService = inject(Title)
  private player = inject(LocalPlayerService)

  protected $directoryHandle = this.player.$directoryHandle
  protected $directoryName = this.player.$directoryName
  protected $files = this.player.$files
  protected $selectedIndex = this.player.$selectedIndex
  protected $selectedFile = this.player.$selectedFile
  protected $videoUrl = this.player.$videoUrl
  protected $isLoading = this.player.$isLoading
  protected $error = this.player.$error
  protected $hasSelection = this.player.$hasSelection
  protected $showOverlay = this.player.$showOverlay
  protected $title = this.player.$title
  protected $hasPrevious = this.player.$hasPrevious
  protected $hasNext = this.player.$hasNext

  protected $pageTitle = computed(() => {
    const fileTitle = this.$title()
    return fileTitle ? `本地视频 - ${fileTitle}` : '本地视频'
  })

  constructor() {
    effect(() => {
      const currentTitle = this.$title()
      const pageTitle = currentTitle
        ? `${currentTitle} | Danmaku Anywhere`
        : 'Danmaku Anywhere'
      this.titleService.setTitle(pageTitle)
    })
  }

  protected onDirectorySelected(handle: FileSystemDirectoryHandleLike) {
    void this.player.onDirectorySelected(handle)
  }

  protected onFilesChanged(files: LocalVideoFileEntry[]) {
    void this.player.onFilesChanged(files)
  }

  protected onFileHandleSelected(handle: FileSystemFileHandleLike) {
    void this.player.onFileHandleSelected(handle)
  }

  private async loadByIndex(index: number) {
    await this.player.loadByIndex(index)
  }

  protected onPrevious() {
    void this.player.onPrevious()
  }

  protected onNext() {
    void this.player.onNext()
  }
}

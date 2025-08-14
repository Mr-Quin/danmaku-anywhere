import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  signal,
} from '@angular/core'
import { ProgressSpinner } from 'primeng/progressspinner'
import { VideoPlayer } from '../../../core/video-player/video-player'
import { LocalFolderSelectorComponent } from './components/local-folder-selector.component'
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
        <h1 class="text-2xl font-semibold">本地视频</h1>
        @if ($directoryName()) {
          <span class="text-sm text-surface-400">{{$directoryName()}}</span>
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
                  @if (!$directoryHandle()) { 请选择一个包含视频文件的文件夹 }
                  @else { 请选择一个视频文件 }
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
  protected $directoryHandle = signal<FileSystemDirectoryHandleLike | null>(
    null
  )
  protected $directoryName = computed(() => this.$directoryHandle()?.name ?? '')
  protected $files = signal<LocalVideoFileEntry[]>([])
  protected $selectedIndex = signal<number | null>(null)
  protected $selectedFile = computed(() => {
    const index = this.$selectedIndex()
    const files = this.$files()
    if (index === null || index < 0 || index >= files.length) return null
    return files[index]
  })
  protected $videoUrl = signal<string | undefined>(undefined)
  protected $isLoading = signal(false)
  protected $error = signal<string | null>(null)

  private objectUrlToRevoke: string | null = null

  protected $hasSelection = computed(() => this.$selectedIndex() !== null)
  protected $showOverlay = computed(
    () => this.$isLoading() || !this.$hasSelection()
  )
  protected $title = computed(() => this.$selectedFile()?.name ?? '')
  protected $hasPrevious = computed(() => {
    const idx = this.$selectedIndex()
    return idx !== null && idx > 0
  })
  protected $hasNext = computed(() => {
    const idx = this.$selectedIndex()
    const total = this.$files().length
    return idx !== null && idx < total - 1
  })

  constructor() {
    effect(() => {
      // Revoke old object URL when video changes
      const currentUrl = this.$videoUrl()
      if (this.objectUrlToRevoke && this.objectUrlToRevoke !== currentUrl) {
        URL.revokeObjectURL(this.objectUrlToRevoke)
        this.objectUrlToRevoke = null
      }
    })
  }

  protected onDirectorySelected(handle: FileSystemDirectoryHandleLike) {
    this.$directoryHandle.set(handle)
    this.$files.set([])
    this.$selectedIndex.set(null)
  }

  protected onFilesChanged(files: LocalVideoFileEntry[]) {
    const sorted = [...files].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true })
    )
    this.$files.set(sorted)
    if (sorted.length > 0) {
      void this.loadByIndex(0)
    }
  }

  protected onFileHandleSelected(handle: FileSystemFileHandleLike) {
    const index = this.$files().findIndex((f) => f.handle === handle)
    if (index !== -1) {
      void this.loadByIndex(index)
    }
  }

  private async loadByIndex(index: number) {
    const files = this.$files()
    if (index < 0 || index >= files.length) return
    this.$selectedIndex.set(index)
    this.$isLoading.set(true)
    try {
      const fileHandle = files[index].handle
      const file = await fileHandle.getFile()
      const url = URL.createObjectURL(file)
      this.objectUrlToRevoke = url
      this.$videoUrl.set(url)
    } finally {
      this.$isLoading.set(false)
    }
  }

  protected onPrevious() {
    const idx = this.$selectedIndex()
    if (idx !== null && idx > 0) {
      void this.loadByIndex(idx - 1)
    }
  }

  protected onNext() {
    const idx = this.$selectedIndex()
    const total = this.$files().length
    if (idx !== null && idx < total - 1) {
      void this.loadByIndex(idx + 1)
    }
  }
}

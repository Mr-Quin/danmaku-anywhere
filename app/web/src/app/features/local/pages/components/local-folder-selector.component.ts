import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  signal,
} from '@angular/core'
import type { TreeNode } from 'primeng/api'
import { Button } from 'primeng/button'
import { Card } from 'primeng/card'
import { Tree } from 'primeng/tree'
import {
  enumeratePlayableTree,
  type LocalVideoFileEntry,
  pickDirectory,
} from '../util/filesystem'

@Component({
  selector: 'da-local-folder-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, Card, Button, Tree],
  template: `
    <p-card>
      <div class="max-h-72 xl:h-max xl:w-[24rem]">
        <div class="mb-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h3 class="font-bold">文件树</h3>
            @if ($directoryName()) {
              <span class="text-sm text-surface-400">{{ $directoryName() }}</span>
            }
          </div>
          <div class="flex items-center gap-2">
            <p-button label="选择文件夹" (onClick)="onPick()" severity="secondary" />
            @if ($hasDirectory()) {
              <p-button label="重新选择" text (onClick)="onPick()" />
            }
          </div>
        </div>
        @if (!$hasDirectory()) {
          <div class="text-center">尚未选择文件夹</div>
        } @else if ($nodes().length === 0) {
          <div class="text-center">没有找到可播放的视频文件</div>
        } @else {
          <p-tree
            [value]="$nodes()"
            selectionMode="single"
            (onNodeSelect)="onNodeSelect($event)"
            [style]="{height: '100%', overflow: 'auto'}"
          />
        }
      </div>
    </p-card>
  `,
})
export class LocalFolderSelectorComponent {
  protected $directoryName = signal('')
  protected $nodes = signal<TreeNode[]>([])
  protected $hasDirectory = signal(false)

  @Output() directorySelected = new EventEmitter<FileSystemDirectoryHandle>()
  @Output() filesChanged = new EventEmitter<LocalVideoFileEntry[]>()
  @Output() fileSelected = new EventEmitter<FileSystemFileHandle>()

  async onPick() {
    try {
      const dir = await pickDirectory()
      this.$directoryName.set(dir.name)
      this.$hasDirectory.set(true)
      this.directorySelected.emit(dir)
      const { nodes, files } = await enumeratePlayableTree(dir)
      this.$nodes.set(nodes)
      this.filesChanged.emit(files)
    } catch {
      //
    }
  }

  onNodeSelect(event: { node: TreeNode }) {
    const node = event.node
    if (node && node.leaf && node.data && typeof node.data === 'object') {
      const maybeHandle = (node.data as { handle?: FileSystemFileHandle })
        .handle
      if (maybeHandle) {
        this.fileSelected.emit(maybeHandle)
      }
    }
  }
}

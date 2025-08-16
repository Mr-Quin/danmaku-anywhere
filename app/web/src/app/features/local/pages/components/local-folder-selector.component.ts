import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  EventEmitter,
  Output,
  signal,
  ViewChild,
} from '@angular/core'
import type { TreeNode } from 'primeng/api'
import { Button } from 'primeng/button'
import { Card } from 'primeng/card'
import { Tree } from 'primeng/tree'
import {
  buildTreeFromFiles,
  enumeratePlayableTree,
  type LocalVideoFileEntry,
  pickDirectory,
  supportsFileSystemApi,
} from '../util/filesystem'

@Component({
  selector: 'da-local-folder-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, Card, Button, Tree],
  template: `
    <p-card>
      <div
        class="h-[500px] xl:w-[24rem] flex flex-col"
        (dragover)="onDragOver($event)"
        (drop)="onDrop($event)"
      >
        <div class="mb-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h3 class="font-bold">文件树</h3>
            @if ($directoryName()) {
              <span class="text-sm text-surface-400">{{ $directoryName() }}</span>
            }
          </div>
          <div class="flex items-center gap-2">
            @if ($supportsFsApi()) {
              <p-button label="选择文件夹" (onClick)="onPick()" severity="secondary" />
            }
            <p-button label="选择文件" (onClick)="onPickFiles()" severity="secondary" />
            <p-button label="展开全部" (onClick)="expandAll()" text />
            <p-button label="折叠全部" (onClick)="collapseAll()" text />
          </div>
        </div>
        @if (!$hasAny()) {
          <div class="text-center">拖拽文件/文件夹到此处，或点击上方按钮选择</div>
        } @else if ($nodes().length === 0) {
          <div class="text-center">没有找到可播放的视频文件</div>
        } @else {
          <p-tree
            [value]="$nodes()"
            selectionMode="single"
            (onNodeSelect)="onNodeSelect($event)"
            [filter]="true"
            filterPlaceholder="过滤"
            class="flex-1 overflow-y-auto"
            styleClass="p-0"
          />
        }
        <input #fileInput type="file" multiple class="hidden" (change)="onFilesInput($event)" />
        <input #dirInput type="file" class="hidden" webkitdirectory directory (change)="onFilesInput($event)" />
      </div>
    </p-card>
  `,
})
export class LocalFolderSelectorComponent {
  protected $directoryName = signal('')
  protected $nodes = signal<TreeNode[]>([])
  protected $hasSelection = signal(false)
  protected $supportsFsApi = signal(supportsFileSystemApi())

  @ViewChild(Tree) tree?: Tree
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>
  @ViewChild('dirInput') dirInput?: ElementRef<HTMLInputElement>

  @Output() directorySelected = new EventEmitter<FileSystemDirectoryHandle>()
  @Output() filesChanged = new EventEmitter<LocalVideoFileEntry[]>()
  @Output() fileSelected = new EventEmitter<FileSystemFileHandle>()

  async onPick() {
    try {
      const dir = await pickDirectory()
      this.$directoryName.set(dir.name)
      this.$hasSelection.set(true)
      this.directorySelected.emit(dir)
      const { nodes, files } = await enumeratePlayableTree(dir)
      this.$nodes.set(nodes)
      this.filesChanged.emit(files)
    } catch {
      //
    }
  }

  onPickFiles() {
    this.fileInput?.nativeElement.click()
  }

  onFilesInput(event: Event) {
    const input = event.target as HTMLInputElement
    const files = input.files
    if (!files || files.length === 0) return
    const { nodes, files: playable } = buildTreeFromFiles(files)
    this.$nodes.set(nodes)
    this.filesChanged.emit(playable)
    this.$hasSelection.set(true)
    // Compute a display name from common prefix of paths
    const name =
      this.computeCommonRoot(playable.map((f) => f.path)) || '已选择的文件'
    this.$directoryName.set(name)
    input.value = ''
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

  onDragOver(event: DragEvent) {
    event.preventDefault()
  }

  onDrop(event: DragEvent) {
    event.preventDefault()
    if (event.dataTransfer) {
      const files = event.dataTransfer.files
      if (files && files.length > 0) {
        const { nodes, files: playable } = buildTreeFromFiles(files)
        this.$nodes.set(nodes)
        this.filesChanged.emit(playable)
        this.$hasSelection.set(true)
        const name =
          this.computeCommonRoot(playable.map((f) => f.path)) || '拖拽的文件'
        this.$directoryName.set(name)
      }
    }
  }

  expandAll() {
    const nodes = this.$nodes()
    this.$nodes.set(setExpanded(cloneNodes(nodes), true))
  }

  collapseAll() {
    const nodes = this.$nodes()
    this.$nodes.set(setExpanded(cloneNodes(nodes), false))
  }

  protected $hasAny = computed(() => this.$hasSelection())

  private computeCommonRoot(paths: string[]): string {
    if (paths.length === 0) return ''
    const split = paths.map((p) => p.split('/').filter(Boolean))
    const minLen = Math.min(...split.map((s) => s.length))
    const parts: string[] = []
    for (let i = 0; i < minLen; i++) {
      const part = split[0][i]
      if (split.every((s) => s[i] === part)) parts.push(part)
      else break
    }
    return parts.join('/')
  }
}

function cloneNodes(nodes: TreeNode[]): TreeNode[] {
  return nodes.map((n) => ({
    ...n,
    children: n.children ? cloneNodes(n.children) : undefined,
  }))
}

function setExpandedOnNode(node: TreeNode, expanded: boolean) {
  if (node.type === 'directory') {
    node.expanded = expanded
    if (node.children)
      node.children.forEach((c) => setExpandedOnNode(c, expanded))
  }
}

function setExpanded(nodes: TreeNode[], expanded: boolean): TreeNode[] {
  nodes.forEach((n) => setExpandedOnNode(n, expanded))
  return nodes
}

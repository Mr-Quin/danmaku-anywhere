import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  EventEmitter,
  inject,
  Output,
  output,
  signal,
  ViewChild,
  viewChild,
} from '@angular/core'
import { MessageService, type TreeNode } from 'primeng/api'
import { Button } from 'primeng/button'
import { Card } from 'primeng/card'
import { Tree } from 'primeng/tree'
import { LocalHandleDbService } from '../services/local-handle-db.service'
import { LocalPlayerService } from '../services/local-player.service'
import {
  buildTreeFromFiles,
  enumeratePlayableTree,
  type LocalVideoFileEntry,
  pickDirectory,
} from '../util/filesystem'
import { supportsFileSystemApi } from '../util/supportsFileSystemApi'

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
          </div>
          <div class="flex items-center gap-2">
            @if (supportsFsApi) {
              <p-button label="添加文件夹" (onClick)="onPick()" severity="secondary" icon="pi pi-folder" />
            } @else {
              <p-button label="选择文件" (onClick)="onPickFiles()" severity="secondary" icon="pi pi-file" />
            }
            <p-button label="展开全部" (onClick)="expandAll()" text />
            <p-button label="折叠全部" (onClick)="collapseAll()" text />
          </div>
        </div>
        @let nodes = $nodes();
        @if (!nodes) {
          <div class="text-center">拖拽文件/文件夹到此处，或点击上方按钮选择</div>
        } @else if (nodes.length === 0) {
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
      </div>
    </p-card>
  `,
})
export class LocalFolderSelectorComponent {
  private readonly localPlayerService = inject(LocalPlayerService)
  private readonly messageService = inject(MessageService)
  protected supportsFsApi = supportsFileSystemApi()

  protected $nodes = this.localPlayerService.$nodes

  readonly directorySelected = output<FileSystemDirectoryHandle>()
  readonly filesChanged = output<LocalVideoFileEntry[]>()
  readonly fileSelected = output<FileSystemFileHandle>()

  async onPick() {
    try {
      const dir = await pickDirectory()
      await this.localPlayerService.onAddDirectory(dir)
    } catch (e) {
      if (e instanceof Error) {
        this.messageService.add({
          severity: 'error',
          summary: '此文件夹已经添加',
          detail: '已经添加过这个文件夹了',
          closable: true,
          life: 3000,
          key: 'dir-pick-error',
        })
      }
      //
    }
  }

  onPickFiles() {}

  onFilesInput(event: Event) {
    const input = event.target as HTMLInputElement
    const files = input.files
    if (!files || files.length === 0) return
    const { nodes, files: playable } = buildTreeFromFiles(files)
    this.$nodes.set(nodes)
    this.filesChanged.emit(playable)
    // Compute a display name from common prefix of paths
    const name =
      this.computeCommonRoot(playable.map((f) => f.path)) || '已选择的文件'
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
        const name =
          this.computeCommonRoot(playable.map((f) => f.path)) || '拖拽的文件'
      }
    }
  }

  expandAll() {
    const nodes = this.$nodes()
    if (nodes) {
      this.$nodes.set(setExpanded(cloneNodes(nodes), true))
    }
  }

  collapseAll() {
    const nodes = this.$nodes()
    if (nodes) {
      this.$nodes.set(setExpanded(cloneNodes(nodes), false))
    }
  }

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

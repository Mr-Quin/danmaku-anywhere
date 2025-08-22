import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  inject,
  output,
  ViewChild,
} from '@angular/core'
import { MessageService, type TreeNode } from 'primeng/api'
import { Button } from 'primeng/button'
import { Card } from 'primeng/card'
import { Tree } from 'primeng/tree'
import { LocalPlayerService } from '../services/local-player.service'
import { supportsFileSystemApi } from '../util/supportsFileSystemApi'
import { FileTree } from '../util/tree-node'

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

  @ViewChild('fileInput') private fileInputRef!: ElementRef<HTMLInputElement>

  protected $nodes = this.localPlayerService.$nodes

  readonly directorySelected = output<FileSystemDirectoryHandle>()
  readonly fileSelected = output<FileSystemFileHandle>()

  async onPick() {
    try {
      const dir = await window.showDirectoryPicker()
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

  onPickFiles() {
    const el = this.fileInputRef?.nativeElement
    if (el) el.click()
  }

  onFilesInput(event: Event) {
    const input = event.target as HTMLInputElement
    const files = input.files
    if (!files || files.length === 0) return
    const tree = FileTree.fromFiles(files)
    this.$nodes.set(tree.getNodes())
    void this.localPlayerService.onFilesTreeChanged(tree)
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
        const tree = FileTree.fromFiles(files)
        this.$nodes.set(tree.getNodes())
        void this.localPlayerService.onFilesTreeChanged(tree)
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
      node.children.forEach((c) => {
        setExpandedOnNode(c, expanded)
      })
  }
}

function setExpanded(nodes: TreeNode[], expanded: boolean): TreeNode[] {
  nodes.forEach((n) => {
    setExpandedOnNode(n, expanded)
  })
  return nodes
}

import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  inject,
  output,
  viewChild,
} from '@angular/core'
import { MessageService, PrimeTemplate } from 'primeng/api'
import { Button } from 'primeng/button'
import { Card } from 'primeng/card'
import { SplitButton } from 'primeng/splitbutton'
import { Tooltip } from 'primeng/tooltip'
import { Tree } from 'primeng/tree'
import { PlatformService } from '../../../core/services/platform.service'
import { TrackingService } from '../../../core/tracking.service'
import { serializeError } from '../../../shared/utils/serializeError'
import { DuplicateHandleException } from '../duplicate-handle.exception'
import { LocalPlayerService } from '../services/local-player.service'
import type { FileTreeNode } from '../util/file-tree'
import { supportsFilesystemApi } from '../util/supports-filesystem-api'

@Component({
  selector: 'da-local-folder-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    Card,
    Button,
    Tree,
    PrimeTemplate,
    Tooltip,
    SplitButton,
  ],
  styleUrl: './local-folder-selector.component.css',
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
            @if ($hasNodes()) {
              <div>
                <p-button (onClick)="expandAll()" text severity="secondary" icon="pi pi-angle-down" />
                <p-button (onClick)="collapseAll()" text severity="secondary" icon="pi pi-angle-up" />
              </div>
            }
          </div>
          <div>
            @if (supportsFsApi && !isMobileEdge) {
              <p-splitbutton label="添加文件夹" (onClick)="onPickFilesystemDir()" severity="secondary"
                             icon="pi pi-folder" [model]="items" />
            } @else {
              <p-splitbutton label="添加文件夹" (onClick)="onPickDir()" severity="secondary" icon="pi pi-file"
                             [model]="items" />
            }
          </div>
        </div>
        @let nodes = $nodes();
        @if (nodes.length === 0) {
          <div class="text-center">没有找到可播放的视频文件</div>
        } @else {
          <p-tree
            [value]="$nodes()"
            selectionMode="single"
            (onNodeSelect)="onNodeSelect($event)"
            [selection]="$selectedNode()"
            [filter]="true"
            filterPlaceholder="过滤"
            class="flex-1 overflow-y-auto"
          >
            <ng-template let-node pTemplate="removableDirectory">
              <div class="flex justify-between items-center">
              <span [pTooltip]="node.label" tooltipPosition="top" [showDelay]="1000">{{ node.label }}
              </span>
                <p-button variant="text" size="small" severity="secondary" icon="pi pi-trash"
                          (onClick)="onRemoveNode(node)" />
              </div>
            </ng-template>
            <ng-template let-node pTemplate="directory">
              <span [pTooltip]="node.label" tooltipPosition="top" [showDelay]="1000">{{ node.label }}</span>
            </ng-template>
            <ng-template let-node pTemplate="file">
              <span [pTooltip]="node.label" tooltipPosition="top">{{ node.label }}</span>
            </ng-template>
          </p-tree>
        }
        <input #dirInput type="file" webkitdirectory directory class="hidden" (change)="onFileInput($event)" />
        <input #fileInput type="file" multiple accept="video/mp4,video/x-m4v,video/*,.mkv" class="hidden"
               (change)="onFileInput($event)" />
      </div>
    </p-card>
  `,
})
export class LocalFolderSelectorComponent {
  private readonly localPlayerService = inject(LocalPlayerService)
  private readonly messageService = inject(MessageService)
  private readonly trackingService = inject(TrackingService)
  private readonly platformService = inject(PlatformService)

  protected readonly supportsFsApi = supportsFilesystemApi()
  readonly isMobileEdge = this.platformService.platform.EDGE

  private $dirInputRef =
    viewChild.required<ElementRef<HTMLInputElement>>('dirInput')
  private $fileInputRef =
    viewChild.required<ElementRef<HTMLInputElement>>('fileInput')

  protected $nodes = this.localPlayerService.$nodes
  protected $hasNodes = this.localPlayerService.$hasNodes
  protected $selectedNode = this.localPlayerService.$selectedNode

  readonly fileSelected = output<FileTreeNode>()

  readonly items = this.supportsFsApi
    ? [
        {
          label: '添加文件夹（备选）',
          command: () => {
            this.onPickDir()
          },
        },
        {
          label: '添加文件',
          command: () => {
            this.onPickFile()
          },
        },
      ]
    : [
        {
          label: '添加文件',
          command: () => {
            this.onPickFile()
          },
        },
      ]

  async onPickFilesystemDir() {
    try {
      const dir = await window.showDirectoryPicker()
      await this.localPlayerService.addDirectory(dir)
    } catch (e) {
      if (e instanceof DuplicateHandleException) {
        this.messageService.add({
          severity: 'error',
          summary: '已经添加过这个文件夹了',
          closable: true,
          life: 3000,
        })
      } else if (e instanceof DOMException && e.name === 'AbortError') {
        return
      } else {
        this.trackingService.track('pickDirError', e as object)
        this.messageService.add({
          severity: 'error',
          summary: '添加文件夹失败',
          detail: serializeError(e),
          closable: true,
          life: 3000,
        })
      }
    }
  }

  onPickDir() {
    this.$dirInputRef().nativeElement.click()
  }

  onPickFile() {
    this.$fileInputRef().nativeElement.click()
  }

  onFileInput(event: Event) {
    const input = event.target as HTMLInputElement
    const files = input.files
    if (!files || files.length === 0) {
      return
    }
    void this.localPlayerService.addFiles(files)
    input.value = ''
  }

  onNodeSelect(event: { node: FileTreeNode }) {
    const node = event.node
    void this.localPlayerService.loadNode(node)
  }

  onDragOver(event: DragEvent) {
    event.preventDefault()
  }

  onRemoveNode(node: FileTreeNode) {
    if (node.data?.key === undefined) {
      this.messageService.add({
        severity: 'error',
        summary: '移除失败',
        detail: '请刷新页面',
        closable: true,
        life: 3000,
      })
      return
    }
    void this.localPlayerService.removeDirectory(node.data.key)
  }

  onDrop(event: DragEvent) {
    event.preventDefault()
    if (event.dataTransfer) {
      const files = event.dataTransfer.files
      if (files && files.length > 0) {
        this.localPlayerService.addFiles(files)
      }
    }
  }

  expandAll() {
    this.localPlayerService.expandAll()
  }

  collapseAll() {
    this.localPlayerService.collapseAll()
  }
}

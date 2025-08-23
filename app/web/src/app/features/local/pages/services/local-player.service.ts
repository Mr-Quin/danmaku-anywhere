import { computed, Injectable, inject, signal } from '@angular/core'
import { ConfirmationService, MessageService } from 'primeng/api'
import { TrackingService } from '../../../../core/tracking.service'
import { serializeError } from '../../../../shared/utils/serializeError'
import {
  FileTree,
  type FileTreeNode,
  type TreeNodeInfo,
} from '../util/file-tree'
import { supportsFilesystemApi } from '../util/supports-filesystem-api'
import {
  type DirectoryHandleSetting,
  LocalHandleDbService,
} from './local-handle-db.service'

@Injectable({ providedIn: 'root' })
export class LocalPlayerService {
  private readonly localHandleDbService = inject(LocalHandleDbService)
  private readonly messageService = inject(MessageService)
  private readonly confirmationService = inject(ConfirmationService)
  private readonly trackingService = inject(TrackingService)

  private objectUrlToRevoke: string | null = null
  private isInit = true

  private readonly fileTree = new FileTree([])

  private $treeVersion = signal(0)
  $nodes = computed(() => {
    this.$treeVersion()
    return this.fileTree.getNodes()
  })
  $hasNodes = computed(() => {
    const nodes = this.$nodes()
    return nodes.length > 0
  })

  $nodeInfo = signal<TreeNodeInfo | null>(null)
  $selectedNode = computed(() => {
    const nodeInfo = this.$nodeInfo()
    if (!nodeInfo) return null
    return nodeInfo.node
  })
  $hasSelection = computed(() => this.$nodeInfo() !== null)
  $videoUrl = signal<string | undefined>(undefined)
  $isLoading = signal(false)

  $showOverlay = computed(() => this.$isLoading() || !this.$hasSelection())
  $error = signal<string | null>(null)

  constructor() {
    void this.checkPersistence()
  }

  async addDirectory(handle: FileSystemDirectoryHandle) {
    await this.localHandleDbService.saveHandle(handle)
    await this.invalidateDirectories()
  }

  async removeDirectory(key: string) {
    await this.localHandleDbService.removeHandle(key)
    await this.invalidateDirectories()
  }

  async addFiles(files: FileList) {
    this.fileTree.addFiles(files)
    this.bumpTree()
  }

  async removeAllDirectories() {
    await this.localHandleDbService.removeAllHandles()
    await this.invalidateDirectories()
  }

  expandAll() {
    this.fileTree.expandAll()
  }

  collapseAll() {
    this.fileTree.collapseAll()
  }

  async loadNode(node: FileTreeNode) {
    const nodeInfo = this.fileTree.getInfo(node)
    this.$nodeInfo.set(nodeInfo)
    this.$isLoading.set(true)
    try {
      const source = node.data?.source
      if (!source) {
        return
      }
      const file = await source.getFile()
      const url = await this.createUrl(file)
      this.$videoUrl.set(url)
    } catch (e) {
      this.messageService.add({
        severity: 'error',
        summary: '读取文件失败',
        detail: serializeError(e),
        closable: true,
        life: 3000,
      })
      this.trackingService.track('errorLoadingLocalFile', e as object)
    } finally {
      this.$isLoading.set(false)
    }
  }

  async onPrevious() {
    const info = this.$nodeInfo()
    if (!info) {
      return
    }
    const prev = info.prevNode
    if (!prev) {
      return
    }
    await this.loadNode(prev)
  }

  async onNext() {
    const info = this.$nodeInfo()
    if (!info) {
      return
    }
    const next = info.nextNode
    if (!next) {
      return
    }
    await this.loadNode(next)
  }

  private async invalidateDirectories() {
    try {
      if (!supportsFilesystemApi()) return
      const handleSettingsList = await this.localHandleDbService.getAllHandles()
      this.fileTree.clear()
      for (const setting of handleSettingsList) {
        // check permission, request for permission if not granted
        // biome-ignore lint/suspicious/noExplicitAny: api not typed yet
        const perm = await (setting.handle as any).queryPermission({
          mode: 'read',
        })
        if (perm !== 'granted') {
          // biome-ignore lint/suspicious/noExplicitAny: api not typed yet
          const status = await (setting.handle as any).requestPermission({
            mode: 'read',
          })
          if (status !== 'granted') {
            continue
          }
        }
        await this.fileTree.addDirectory(setting)
      }
      this.bumpTree()
    } catch (e) {
      this.messageService.add({
        severity: 'error',
        summary: '读取文件列表失败',
        detail: serializeError(e),
        closable: true,
        life: 3000,
      })
    }
  }

  private async checkPersistence(): Promise<void> {
    if (!this.isInit) {
      return
    }
    this.isInit = false
    const existing = await this.localHandleDbService.getAllHandles()
    if (existing.length > 0) {
      try {
        await this.invalidateDirectories()
      } catch {
        // some browsers require user action when requesting permission for handles
        this.promptRestoration(existing)
      }
    }
  }

  private promptRestoration(directoryHandles: DirectoryHandleSetting[]): void {
    this.confirmationService.confirm({
      header: '是否恢复上次打开的文件夹？',
      message: directoryHandles.map((s) => s.handle.name).join(', '),
      closable: false,
      acceptButtonProps: {
        label: '恢复',
        severity: 'primary',
      },
      rejectButtonProps: {
        label: '清空',
        severity: 'secondary',
      },
      accept: () => {
        void this.invalidateDirectories()
      },
      reject: () => {
        void this.removeAllDirectories()
      },
    })
  }

  private async createUrl(file: File): Promise<string> {
    if (this.objectUrlToRevoke) {
      URL.revokeObjectURL(this.objectUrlToRevoke)
    }
    if (file.type.indexOf('matroska') !== -1) {
      this.messageService.add({
        severity: 'error',
        summary: '播放MKV文件请使用Chrome',
        closable: true,
        life: 3000,
      })
    }
    const url = URL.createObjectURL(file)
    this.trackingService.track('createUrl', { url })
    this.objectUrlToRevoke = url
    return url
  }

  private bumpTree(): void {
    this.$treeVersion.update((v) => v + 1)
  }
}

import { computed, effect, Injectable, inject, signal } from '@angular/core'
import { MessageService } from 'primeng/api'
import { serializeError } from '../../../../shared/utils/serializeError'
import { supportsFileSystemApi } from '../util/supportsFileSystemApi'
import {
  FileTree,
  type FileTreeNode,
  type TreeNodeInfo,
} from '../util/tree-node'
import { LocalHandleDbService } from './local-handle-db.service'

@Injectable({ providedIn: 'root' })
export class LocalPlayerService {
  private readonly localHandleDbService = inject(LocalHandleDbService)
  private readonly messageService = inject(MessageService)

  private objectUrlToRevoke: string | null = null

  private $fileTree = signal<FileTree | null>(null)
  $nodes = computed(() => {
    const tree = this.$fileTree()
    if (!tree) return null
    return tree.getNodes()
  })
  $hasNodes = computed(() => {
    const nodes = this.$nodes()
    return nodes && nodes.length > 0
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
    effect(() => {
      const currentUrl = this.$videoUrl()
      if (this.objectUrlToRevoke && this.objectUrlToRevoke !== currentUrl) {
        URL.revokeObjectURL(this.objectUrlToRevoke)
        this.objectUrlToRevoke = null
      }
    })

    void this.restorePersistedDirectory()
  }

  async restorePersistedDirectory() {
    try {
      if (!supportsFileSystemApi()) return
      const [handleSettings] = await this.localHandleDbService.getAllHandles()
      if (!handleSettings) {
        this.$fileTree.set(null)
        return
      }
      // check permission, request for permission if not granted
      // biome-ignore lint/suspicious/noExplicitAny: api not typed yet
      const perm = await (handleSettings.handle as any).queryPermission({
        mode: 'read',
      })
      if (perm !== 'granted') {
        // biome-ignore lint/suspicious/noExplicitAny: api not typed yet
        const status = await (handleSettings.handle as any).requestPermission({
          mode: 'read',
        })
        if (status !== 'granted') {
          return
        }
      }
      const tree = await FileTree.fromDirectory(handleSettings)
      this.$fileTree.set(tree)
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

  async addDirectory(handle: FileSystemDirectoryHandle) {
    await this.localHandleDbService.saveHandle(handle)
    await this.restorePersistedDirectory()
  }

  async removeDirectory(key: string) {
    await this.localHandleDbService.removeHandle(key)
    await this.restorePersistedDirectory()
  }

  async onFilesTreeChanged(tree: FileTree) {
    this.$fileTree.set(tree)
  }

  expandAll() {
    const tree = this.$fileTree()
    if (!tree) {
      return
    }
    tree.expandAll()
  }

  collapseAll() {
    const tree = this.$fileTree()
    if (!tree) {
      return
    }
    tree.collapseAll()
  }

  async loadNode(node: FileTreeNode) {
    const tree = this.$fileTree()
    if (!tree) {
      return
    }
    const nodeInfo = tree.getInfo(node)
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
      console.error(e)
    } finally {
      this.$isLoading.set(false)
    }
  }

  async onPrevious() {
    const tree = this.$fileTree()
    const info = this.$nodeInfo()
    if (!info || !tree) {
      return
    }
    const prev = info.prevNode
    if (!prev) {
      return
    }
    await this.loadNode(prev)
  }

  async onNext() {
    const tree = this.$fileTree()
    const info = this.$nodeInfo()
    if (!info || !tree) {
      return
    }
    const next = info.nextNode
    if (!next) {
      return
    }
    await this.loadNode(next)
  }

  private async createUrl(file: File): Promise<string> {
    console.log('createUrl', file)
    if (this.objectUrlToRevoke) {
      URL.revokeObjectURL(this.objectUrlToRevoke)
    }
    if (file.type.includes('matroska')) {
      this.messageService.add({
        severity: 'error',
        summary: '暂不支持播放mkv文件',
        closable: true,
        life: 3000,
      })
    }
    const url = URL.createObjectURL(file)
    this.objectUrlToRevoke = url
    console.log('createdUrl', url)
    return url
  }
}

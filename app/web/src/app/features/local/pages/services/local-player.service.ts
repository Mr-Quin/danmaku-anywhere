import { computed, effect, Injectable, inject, signal } from '@angular/core'
import { supportsFileSystemApi } from '../util/supportsFileSystemApi'
import {
  FileTree,
  type FileTreeNode,
  type TreeNodeInfo,
} from '../util/tree-node'
import { LocalHandleDbService } from './local-handle-db.service'

@Injectable({ providedIn: 'root' })
export class LocalPlayerService {
  private objectUrlToRevoke: string | null = null
  private readonly localHandleDbService = inject(LocalHandleDbService)

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
  $showOverlay = computed(() => this.$isLoading() || !this.$hasSelection())

  $videoUrl = signal<string | undefined>(undefined)
  $isLoading = signal(false)
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
    } catch {
      // ignore
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
      const fileHandle = node.data?.handle
      if (!fileHandle || !(fileHandle instanceof FileSystemFileHandle)) {
        return
      }
      const url = await this.createUrl(fileHandle)
      this.$videoUrl.set(url)
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

  private async createUrl(fileHandle: FileSystemFileHandle): Promise<string> {
    if (this.objectUrlToRevoke) {
      URL.revokeObjectURL(this.objectUrlToRevoke)
    }
    const file = await fileHandle.getFile()
    const url = URL.createObjectURL(file)
    this.objectUrlToRevoke = url
    return url
  }
}

import { computed, effect, Injectable, inject, signal } from '@angular/core'
import type { TreeNode } from 'primeng/api'
import { supportsFileSystemApi } from '../util/supportsFileSystemApi'
import { FileTree } from '../util/tree-node'
import { LocalHandleDbService } from './local-handle-db.service'

@Injectable({ providedIn: 'root' })
export class LocalPlayerService {
  $directoryHandle = signal<FileSystemDirectoryHandle | null>(null)
  $directoryName = computed(() => this.$directoryHandle()?.name ?? '')
  $nodes = signal<TreeNode[] | null>(null)
  $fileTree = signal<FileTree | null>(null)
  $selectedIndex = signal<number | null>(null)
  $selectedNode = computed(() => {
    const index = this.$selectedIndex()
    const tree = this.$fileTree()
    if (!tree || index === null) return null
    const list = tree.getFileNodes()
    if (index < 0 || index >= list.length) return null
    return list[index]
  })
  $videoUrl = signal<string | undefined>(undefined)
  $isLoading = signal(false)
  $error = signal<string | null>(null)

  private objectUrlToRevoke: string | null = null

  $hasSelection = computed(() => this.$selectedIndex() !== null)
  $showOverlay = computed(() => this.$isLoading() || !this.$hasSelection())
  $title = computed(() => this.$selectedNode()?.label ?? '')
  $hasPrevious = computed(() => {
    const idx = this.$selectedIndex()
    return idx !== null && idx > 0
  })
  $hasNext = computed(() => {
    const idx = this.$selectedIndex()
    const total = this.$fileTree()?.getFileNodes().length ?? 0
    return idx !== null && idx < total - 1
  })

  private localHandleDbService = inject(LocalHandleDbService)

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
      const handles = await this.localHandleDbService.getAllHandles()
      const [{ handle }] = handles
      if (!handle) {
        return
      }
      // check permission, request for permission if not granted
      // biome-ignore lint/suspicious/noExplicitAny: api not typed yet
      const perm = await (handle as any).queryPermission({
        mode: 'read',
      })
      if (perm !== 'granted') {
        // biome-ignore lint/suspicious/noExplicitAny: api not typed yet
        const status = await (handle as any).requestPermission({
          mode: 'read',
        })
        if (status !== 'granted') {
          return
        }
      }
      this.$directoryHandle.set(handle)
      const tree = await FileTree.fromDirectory(handle)
      this.$nodes.set(tree.getNodes())
      this.$fileTree.set(tree)
    } catch {
      // ignore
    }
  }

  async onAddDirectory(handle: FileSystemDirectoryHandle) {
    this.$directoryHandle.set(handle)
    this.$nodes.set(null)
    this.$fileTree.set(null)
    this.$selectedIndex.set(null)
    await this.localHandleDbService.saveHandle(handle)
    const tree = await FileTree.fromDirectory(handle)
    this.$nodes.set(tree.getNodes())
    this.$fileTree.set(tree)
    const list = tree.getFileNodes()
    if (list.length > 0) await this.loadByIndex(0)
  }

  async onFilesTreeChanged(tree: FileTree) {
    this.$directoryHandle.set(null)
    this.$fileTree.set(tree)
    this.$nodes.set(tree.getNodes())
    const list = tree.getFileNodes()
    if (list.length > 0) await this.loadByIndex(0)
  }

  async onFileHandleSelected(handle: FileSystemFileHandle) {
    const tree = this.$fileTree()
    if (!tree) return
    const node = tree.findNodeByHandle(handle)
    if (!node) return
    const index = tree.indexOf(node)
    if (index !== -1) await this.loadByIndex(index)
  }

  async loadByIndex(index: number) {
    const tree = this.$fileTree()
    if (!tree) return
    const list = tree.getFileNodes()
    if (index < 0 || index >= list.length) return
    this.$selectedIndex.set(index)
    this.$isLoading.set(true)
    try {
      const node = list[index]
      const fileHandle = tree.getHandle(node)
      if (!fileHandle) return
      const file = await fileHandle.getFile()
      const url = URL.createObjectURL(file)
      this.objectUrlToRevoke = url
      this.$videoUrl.set(url)
    } finally {
      this.$isLoading.set(false)
    }
  }

  async onPrevious() {
    const idx = this.$selectedIndex()
    if (idx !== null && idx > 0) await this.loadByIndex(idx - 1)
  }

  async onNext() {
    const idx = this.$selectedIndex()
    const total = this.$fileTree()?.getFileNodes().length ?? 0
    if (idx !== null && idx < total - 1) await this.loadByIndex(idx + 1)
  }
}

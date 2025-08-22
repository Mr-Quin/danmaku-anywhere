import { computed, effect, Injectable, inject, signal } from '@angular/core'
import type { TreeNode } from 'primeng/api'
import { supportsFileSystemApi } from '../util/supportsFileSystemApi'
import type { LocalVideoFileEntry } from '../util/tree-node'
import { enumerateDirectoryTree } from '../util/tree-node'
import { LocalHandleDbService } from './local-handle-db.service'

@Injectable({ providedIn: 'root' })
export class LocalPlayerService {
  $directoryHandle = signal<FileSystemDirectoryHandle | null>(null)
  $directoryName = computed(() => this.$directoryHandle()?.name ?? '')
  $nodes = signal<TreeNode[] | null>(null)
  $files = signal<LocalVideoFileEntry[]>([])
  $selectedIndex = signal<number | null>(null)
  $selectedFile = computed(() => {
    const index = this.$selectedIndex()
    const files = this.$files()
    if (index === null || index < 0 || index >= files.length) return null
    return files[index]
  })
  $videoUrl = signal<string | undefined>(undefined)
  $isLoading = signal(false)
  $error = signal<string | null>(null)

  private objectUrlToRevoke: string | null = null

  $hasSelection = computed(() => this.$selectedIndex() !== null)
  $showOverlay = computed(() => this.$isLoading() || !this.$hasSelection())
  $title = computed(() => this.$selectedFile()?.name ?? '')
  $hasPrevious = computed(() => {
    const idx = this.$selectedIndex()
    return idx !== null && idx > 0
  })
  $hasNext = computed(() => {
    const idx = this.$selectedIndex()
    const total = this.$files().length
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
      const { nodes, files } = await enumerateDirectoryTree(handle)
      this.$nodes.set(nodes)
      this.setFiles(files)
    } catch {
      // ignore
    }
  }

  async onAddDirectory(handle: FileSystemDirectoryHandle) {
    this.$directoryHandle.set(handle)
    this.$nodes.set(null)
    this.$files.set([])
    this.$selectedIndex.set(null)
    await this.localHandleDbService.saveHandle(handle)
    const { nodes, files } = await enumerateDirectoryTree(handle)
    this.$nodes.set(nodes)
    this.setFiles(files)
    if (files.length > 0) await this.loadByIndex(0)
  }

  async onFilesChanged(files: LocalVideoFileEntry[]) {
    const sorted = [...files].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true })
    )
    this.$directoryHandle.set(null)
    this.setFiles(sorted)
    if (sorted.length > 0) await this.loadByIndex(0)
  }

  async onFileHandleSelected(handle: FileSystemFileHandle) {
    const index = this.$files().findIndex((f) => f.handle === handle)
    if (index !== -1) await this.loadByIndex(index)
  }

  async loadByIndex(index: number) {
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

  async onPrevious() {
    const idx = this.$selectedIndex()
    if (idx !== null && idx > 0) await this.loadByIndex(idx - 1)
  }

  async onNext() {
    const idx = this.$selectedIndex()
    const total = this.$files().length
    if (idx !== null && idx < total - 1) await this.loadByIndex(idx + 1)
  }

  private setFiles(files: LocalVideoFileEntry[]) {
    this.$files.set(files)
  }
}

import type { TreeNode } from 'primeng/api'
import type { DirectoryHandleSetting } from '../services/local-handle-db.service'
import {
  type FileSource,
  HandleFileSource,
  InlineFileSource,
} from './file-source'

const playableExtensions = new Set<string>([
  '.mp4',
  '.webm',
  '.ogv',
  '.ogg',
  '.m4v',
  '.mkv',
  '.avi',
])

const subtitleExtensions = new Set<string>(['.srt', '.ass', '.ssa', '.vtt'])

export interface SubtitleFileInfo {
  name: string
  ext: string
  source: FileSource
}

export type FileTreeNode = TreeNode<{ source?: FileSource; key?: string }>

export interface TreeNodeInfo {
  node: FileTreeNode
  name: string
  hasPrev: boolean
  hasNext: boolean
  prevNode: FileTreeNode | null
  nextNode: FileTreeNode | null
  subtitleFiles: SubtitleFileInfo[]
}

function getExtension(name: string): string {
  const lower = name.toLowerCase()
  const dotIndex = lower.lastIndexOf('.')
  return dotIndex >= 0 ? lower.slice(dotIndex) : ''
}

function isPlayableFileName(name: string): boolean {
  return playableExtensions.has(getExtension(name))
}

function isSubtitleFileName(name: string): boolean {
  return subtitleExtensions.has(getExtension(name))
}

/** Get the file name stem without extension */
function getFileStem(name: string): string {
  const dotIndex = name.lastIndexOf('.')
  return dotIndex >= 0 ? name.slice(0, dotIndex) : name
}

/** Attach subtitle files as non-selectable children of video nodes, sorted by stem match */
function attachSubtitleChildren(
  videoNodes: FileTreeNode[],
  subtitles: SubtitleFileInfo[]
): void {
  if (subtitles.length === 0 || videoNodes.length === 0) return

  for (const videoNode of videoNodes) {
    const videoStem = getFileStem(videoNode.label ?? '').toLowerCase()
    const sorted = [...subtitles].sort((a, b) => {
      const aMatch = getFileStem(a.name).toLowerCase() === videoStem ? 0 : 1
      const bMatch = getFileStem(b.name).toLowerCase() === videoStem ? 0 : 1
      return aMatch - bMatch
    })
    videoNode.children = sorted.map((sub) => ({
      key: `${videoNode.key}/__sub__/${sub.name}`,
      label: sub.name,
      data: { source: sub.source },
      leaf: true,
      selectable: false,
      icon: 'pi pi-file',
      type: 'subtitle',
    }))
    videoNode.leaf = false
    videoNode.expanded = false
  }
}

function pruneEmpty(node: FileTreeNode): void {
  if (!node.children) {
    return
  }
  node.children = node.children.filter((child) => {
    if (child.type === 'directory') {
      pruneEmpty(child)
      return child.children && child.children.length > 0
    }
    return true
  })
}

function cloneWithExpanded(nodes: TreeNode[], expanded: boolean): TreeNode[] {
  return nodes.map((n) => {
    if (n.type === 'directory' || n.type === 'removableDirectory') {
      return {
        ...n,
        expanded,
        children: n.children
          ? cloneWithExpanded(n.children, expanded)
          : undefined,
      }
    }
    return n
  })
}

export class FileTree {
  private parentMap = new WeakMap<FileTreeNode, FileTreeNode | null>()
  private flatFileNodes: FileTreeNode[] = []

  constructor(private roots: FileTreeNode[] = []) {
    this.buildIndexes()
  }

  async addDirectory(settings: DirectoryHandleSetting): Promise<void> {
    const root: FileTreeNode = {
      key: settings.handle.name,
      label: settings.handle.name,
      type: 'removableDirectory',
      data: settings,
      children: [],
      selectable: false,
      icon: 'pi pi-folder',
    }

    const walk = async (
      dir: FileSystemDirectoryHandle,
      parent: FileTreeNode,
      basePath: string
    ): Promise<void> => {
      const videoNodes: FileTreeNode[] = []
      const subtitles: SubtitleFileInfo[] = []

      for await (const entry of dir.values()) {
        const key = `${basePath}/${entry.name}`
        if (entry.kind === 'directory') {
          const node: FileTreeNode = {
            key,
            label: entry.name,
            type: 'directory',
            children: [],
            selectable: false,
            icon: 'pi pi-folder',
          }
          parent.children?.push(node)
          await walk(entry as FileSystemDirectoryHandle, node, key)
        } else if (entry.kind === 'file') {
          const ext = getExtension(entry.name)
          if (playableExtensions.has(ext)) {
            const node: FileTreeNode = {
              key,
              label: entry.name,
              data: {
                source: new HandleFileSource(entry as FileSystemFileHandle),
              },
              leaf: true,
              icon: 'pi pi-video',
              type: 'file',
              selectable: true,
            }
            parent.children?.push(node)
            videoNodes.push(node)
          } else if (subtitleExtensions.has(ext)) {
            subtitles.push({
              name: entry.name,
              ext: ext.slice(1), // remove the dot
              source: new HandleFileSource(entry as FileSystemFileHandle),
            })
          }
        }
      }

      attachSubtitleChildren(videoNodes, subtitles)
    }

    await walk(settings.handle, root, '')
    pruneEmpty(root)
    this.roots = [...this.roots, root]
    this.buildIndexes()
  }

  addFiles(files: FileList): void {
    const toArray = Array.from(files)

    type SyntheticEntry = {
      name: string
      file: File
      path: string
    }
    const entries: SyntheticEntry[] = []
    const subtitleEntries: { file: File; path: string }[] = []

    for (const file of toArray) {
      const relativePath =
        (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
        file.name
      if (isPlayableFileName(file.name)) {
        entries.push({ name: file.name, file, path: relativePath })
      } else if (isSubtitleFileName(file.name)) {
        subtitleEntries.push({ file, path: relativePath })
      }
    }

    const root: FileTreeNode = { key: '', label: '', children: [] }
    const dirMap = new Map<string, FileTreeNode>()
    dirMap.set('', root)

    const pushChild = (parent: FileTreeNode, child: FileTreeNode) => {
      if (!parent.children) parent.children = []
      parent.children.push(child)
    }

    const videoNodesByDir = new Map<string, FileTreeNode[]>()

    for (const entry of entries) {
      const parts = entry.path.split('/').filter(Boolean)
      let currentPath = ''
      let parent = root
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        currentPath = currentPath ? `${currentPath}/${part}` : part
        let dirNode = dirMap.get(currentPath)
        if (!dirNode) {
          dirNode = {
            key: currentPath,
            label: part,
            type: 'directory',
            children: [],
            selectable: false,
            icon: 'pi pi-folder',
          }
          pushChild(parent, dirNode)
          dirMap.set(currentPath, dirNode)
        }
        parent = dirNode
      }
      const fileName = parts[parts.length - 1]
      const dirPath = currentPath
      const node: FileTreeNode = {
        key: entry.path,
        label: fileName,
        data: { source: new InlineFileSource(entry.file) },
        leaf: true,
        icon: 'pi pi-video',
        type: 'file',
        selectable: true,
      }
      pushChild(parent, node)
      const dirNodes = videoNodesByDir.get(dirPath) ?? []
      dirNodes.push(node)
      videoNodesByDir.set(dirPath, dirNodes)
    }

    // Group subtitle files by directory and attach as children of video nodes
    const subtitlesByDir = new Map<string, SubtitleFileInfo[]>()
    for (const sub of subtitleEntries) {
      const parts = sub.path.split('/').filter(Boolean)
      const dirPath = parts.length > 1 ? parts.slice(0, -1).join('/') : ''
      const existing = subtitlesByDir.get(dirPath) ?? []
      existing.push({
        name: sub.file.name,
        ext: getExtension(sub.file.name).slice(1),
        source: new InlineFileSource(sub.file),
      })
      subtitlesByDir.set(dirPath, existing)
    }

    for (const [dirPath, subs] of subtitlesByDir) {
      const videoNodes = videoNodesByDir.get(dirPath) ?? []
      attachSubtitleChildren(videoNodes, subs)
    }

    if (root.children) {
      this.roots = [...this.roots, ...root.children]
    }
    this.buildIndexes()
  }

  clear(): void {
    this.roots = []
    this.buildIndexes()
  }

  getNodes(): FileTreeNode[] {
    return [...this.roots]
  }

  getInfo(node: FileTreeNode): TreeNodeInfo {
    const prevNode = this.prevOf(node)
    const nextNode = this.nextOf(node)

    // Extract subtitle info from children nodes (already sorted by stem match)
    const subtitleFiles: SubtitleFileInfo[] = []
    if (node.children) {
      for (const child of node.children) {
        if (child.type === 'subtitle' && child.label && child.data?.source) {
          subtitleFiles.push({
            name: child.label,
            ext: getExtension(child.label).slice(1),
            source: child.data.source,
          })
        }
      }
    }

    return {
      node,
      name: node.label ?? '',
      hasPrev: prevNode !== null,
      hasNext: nextNode !== null,
      prevNode,
      nextNode,
      subtitleFiles,
    }
  }

  expandAll() {
    this.roots = cloneWithExpanded(this.roots, true)
    this.buildIndexes()
  }

  collapseAll() {
    this.roots = cloneWithExpanded(this.roots, false)
    this.buildIndexes()
  }

  private buildIndexes() {
    this.parentMap = new WeakMap<FileTreeNode, FileTreeNode | null>()
    this.flatFileNodes = []

    const visit = (node: FileTreeNode, parent: FileTreeNode | null) => {
      this.parentMap.set(node, parent)
      if (node.type === 'file') {
        this.flatFileNodes.push(node)
        return // subtitle children don't need indexing
      }
      if (node.children) {
        for (const child of node.children) {
          visit(child, node)
        }
      }
    }

    for (const root of this.roots) {
      visit(root, null)
    }
  }

  private indexOf(node: FileTreeNode): number {
    return this.flatFileNodes.indexOf(node)
  }

  private nextOf(node: FileTreeNode): FileTreeNode | null {
    const idx = this.indexOf(node)
    if (idx === -1) return null
    return idx < this.flatFileNodes.length - 1
      ? this.flatFileNodes[idx + 1]
      : null
  }

  private prevOf(node: FileTreeNode): FileTreeNode | null {
    const idx = this.indexOf(node)
    if (idx <= 0) return null
    return this.flatFileNodes[idx - 1]
  }
}

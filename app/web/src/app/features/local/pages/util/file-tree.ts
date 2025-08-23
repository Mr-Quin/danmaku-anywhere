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

export type FileTreeNode = TreeNode<{ source?: FileSource; key?: string }>

export interface TreeNodeInfo {
  node: FileTreeNode
  name: string
  hasPrev: boolean
  hasNext: boolean
  prevNode: FileTreeNode | null
  nextNode: FileTreeNode | null
}

function isPlayableFileName(name: string): boolean {
  const lower = name.toLowerCase()
  const dotIndex = lower.lastIndexOf('.')
  const ext = dotIndex >= 0 ? lower.slice(dotIndex) : ''
  return playableExtensions.has(ext)
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

function setExpanded(nodes: TreeNode[], expanded: boolean): TreeNode[] {
  nodes.forEach((n) => {
    if (!n.leaf) {
      n.expanded = expanded
      if (n.children)
        n.children.forEach((c) => {
          setExpanded([c], expanded)
        })
    }
  })
  return nodes
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
          const lower = entry.name.toLowerCase()
          const dotIndex = lower.lastIndexOf('.')
          const ext = dotIndex >= 0 ? lower.slice(dotIndex) : ''
          if (!playableExtensions.has(ext)) {
            continue
          }
          parent.children?.push({
            key,
            label: entry.name,
            data: {
              source: new HandleFileSource(entry as FileSystemFileHandle),
            },
            leaf: true,
            icon: 'pi pi-video',
            type: 'file',
            selectable: true,
          })
        }
      }
    }

    await walk(settings.handle, root, '')
    pruneEmpty(root)
    this.roots = [...this.roots, root]
    this.buildIndexes()
  }

  addFiles(filesLike: FileList | File[]): void {
    const toArray = Array.from(filesLike as unknown as File[])

    type SyntheticEntry = {
      name: string
      file: File
      path: string
    }
    const entries: SyntheticEntry[] = []

    for (const file of toArray) {
      if (!isPlayableFileName(file.name)) continue
      const relativePath =
        (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
        file.name
      entries.push({ name: file.name, file, path: relativePath })
    }

    const root: FileTreeNode = { key: '', label: '', children: [] }
    const dirMap = new Map<string, FileTreeNode>()
    dirMap.set('', root)

    const pushChild = (parent: FileTreeNode, child: FileTreeNode) => {
      if (!parent.children) parent.children = []
      parent.children.push(child)
    }

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
      pushChild(parent, {
        key: entry.path,
        label: fileName,
        data: { source: new InlineFileSource(entry.file) },
        leaf: true,
        icon: 'pi pi-video',
        type: 'file',
        selectable: true,
      })
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
    return this.roots
  }

  getInfo(node: FileTreeNode): TreeNodeInfo {
    const prevNode = this.prevOf(node)
    const nextNode = this.nextOf(node)

    return {
      node,
      name: node.label ?? '',
      hasPrev: prevNode !== null,
      hasNext: nextNode !== null,
      prevNode,
      nextNode,
    }
  }

  expandAll() {
    setExpanded(this.roots, true)
  }

  collapseAll() {
    setExpanded(this.roots, false)
  }

  private buildIndexes() {
    this.parentMap = new WeakMap<FileTreeNode, FileTreeNode | null>()
    this.flatFileNodes = []

    const visit = (node: FileTreeNode, parent: FileTreeNode | null) => {
      this.parentMap.set(node, parent)
      if (node.leaf && node.type === 'file') {
        this.flatFileNodes.push(node)
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

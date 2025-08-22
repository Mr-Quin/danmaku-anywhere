import type { TreeNode } from 'primeng/api'
import { supportsFileSystemApi } from './supportsFileSystemApi'

export interface LocalVideoFileEntry {
  name: string
  handle: FileSystemFileHandle
  path: string
}

const playableExtensions = new Set<string>([
  '.mp4',
  '.webm',
  '.ogv',
  '.ogg',
  '.m4v',
  '.mkv',
  '.avi',
])

export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!supportsFileSystemApi()) {
    throw new Error('当前浏览器不支持文件系统访问 API')
  }
  return window.showDirectoryPicker()
}

export async function enumeratePlayableTree(
  root: FileSystemDirectoryHandle
): Promise<{ nodes: TreeNode[]; files: LocalVideoFileEntry[] }> {
  const files: LocalVideoFileEntry[] = []

  async function walk(
    dir: FileSystemDirectoryHandle,
    basePath: string
  ): Promise<TreeNode | null> {
    const childNodes: TreeNode[] = []
    const directories: TreeNode[] = []
    const fileNodes: TreeNode[] = []
    for await (const entry of dir.values()) {
      if (entry.kind === 'directory') {
        const child = await walk(
          entry as FileSystemDirectoryHandle,
          basePath ? `${basePath}/${entry.name}` : entry.name
        )
        if (child) {
          directories.push(child)
        }
      } else if (entry.kind === 'file') {
        const lower = entry.name.toLowerCase()
        const dotIndex = lower.lastIndexOf('.')
        const ext = dotIndex >= 0 ? lower.slice(dotIndex) : ''
        if (playableExtensions.has(ext)) {
          const relativePath = basePath
            ? `${basePath}/${entry.name}`
            : entry.name
          files.push({
            name: entry.name,
            handle: entry as FileSystemFileHandle,
            path: relativePath,
          })
          fileNodes.push({
            key: relativePath,
            label: entry.name,
            data: { handle: entry, path: relativePath },
            leaf: true,
            icon: 'pi pi-video',
            type: 'file',
            selectable: true,
          })
        }
      }
    }

    // Sort directories and files naturally by label
    directories.sort((a, b) =>
      (a.label ?? '').localeCompare(b.label ?? '', undefined, { numeric: true })
    )
    fileNodes.sort((a, b) =>
      (a.label ?? '').localeCompare(b.label ?? '', undefined, { numeric: true })
    )

    childNodes.push(...directories, ...fileNodes)

    // If this directory (dir) is the root, we return a list of its children, not a single node
    if (dir === root) {
      return { key: '', label: '', children: childNodes } // placeholder, caller will unwrap children
    }

    // Prune empty directories
    if (childNodes.length === 0) {
      return null
    }

    return {
      key: basePath,
      label: dir.name,
      type: 'directory',
      children: childNodes,
      selectable: false,
      icon: 'pi pi-folder',
    }
  }

  const rootResult = await walk(root, '')
  const nodes: TreeNode[] = rootResult?.children ?? []

  return { nodes, files }
}

export function isPlayableFileName(name: string): boolean {
  const lower = name.toLowerCase()
  const dotIndex = lower.lastIndexOf('.')
  const ext = dotIndex >= 0 ? lower.slice(dotIndex) : ''
  return playableExtensions.has(ext)
}

export function buildTreeFromFiles(filesLike: FileList | File[]): {
  nodes: TreeNode[]
  files: LocalVideoFileEntry[]
} {
  const files: LocalVideoFileEntry[] = []

  const toArray = Array.from(filesLike as unknown as File[])

  for (const file of toArray) {
    if (!isPlayableFileName(file.name)) continue
    // Use webkitRelativePath when available to reconstruct directory structure
    const relativePath = (file as any).webkitRelativePath || file.name

    // Create a synthetic FileSystemFileHandle-like object using the File System Access API
    // When not available, we fall back to a shim via the File object using getFile()
    const handle = {
      kind: 'file',
      name: file.name,
      async getFile() {
        return file
      },
    } as unknown as FileSystemFileHandle

    files.push({ name: file.name, handle, path: relativePath })
  }

  // Build tree nodes from relative paths
  const root: TreeNode = { key: '', label: '', children: [] }
  const dirMap = new Map<string, TreeNode>()
  dirMap.set('', root)

  for (const entry of files) {
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
        parent.children!.push(dirNode)
        dirMap.set(currentPath, dirNode)
      }
      parent = dirNode
    }
    const fileName = parts[parts.length - 1]
    parent.children!.push({
      key: entry.path,
      label: fileName,
      data: { handle: entry.handle, path: entry.path },
      leaf: true,
      icon: 'pi pi-video',
      type: 'file',
      selectable: true,
    })
  }

  // Sort directories and files naturally by label at every level
  function sortNodes(node: TreeNode) {
    if (!node.children) return
    const directories: TreeNode[] = []
    const fileNodes: TreeNode[] = []
    for (const child of node.children) {
      if (child.type === 'directory') directories.push(child)
      else fileNodes.push(child)
    }
    directories.sort((a, b) =>
      (a.label ?? '').localeCompare(b.label ?? '', undefined, { numeric: true })
    )
    fileNodes.sort((a, b) =>
      (a.label ?? '').localeCompare(b.label ?? '', undefined, { numeric: true })
    )
    node.children = [...directories, ...fileNodes]
    for (const child of directories) sortNodes(child)
  }
  sortNodes(root)

  return { nodes: root.children ?? [], files }
}

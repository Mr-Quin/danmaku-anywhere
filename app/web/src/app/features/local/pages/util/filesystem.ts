import type { TreeNode } from 'primeng/api'

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
])

export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!('showDirectoryPicker' in window)) {
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

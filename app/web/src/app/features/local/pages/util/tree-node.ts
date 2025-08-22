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
  '.avi',
])

function pruneEmpty(node: TreeNode): void {
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

export async function enumerateDirectoryTree(
  handle: FileSystemDirectoryHandle
): Promise<{ nodes: TreeNode[]; files: LocalVideoFileEntry[] }> {
  const files: LocalVideoFileEntry[] = []

  async function walk(
    dir: FileSystemDirectoryHandle,
    root: TreeNode,
    basePath: string
  ): Promise<void> {
    for await (const entry of dir.values()) {
      const key = `${basePath}/${entry.name}`

      if (entry.kind === 'directory') {
        const node = {
          key,
          label: entry.name,
          type: 'directory',
          children: [],
          selectable: false,
          icon: 'pi pi-folder',
        } satisfies TreeNode

        root.children?.push(node)

        await walk(entry as FileSystemDirectoryHandle, node, key)
      } else if (entry.kind === 'file') {
        const lower = entry.name.toLowerCase()
        const dotIndex = lower.lastIndexOf('.')
        const ext = dotIndex >= 0 ? lower.slice(dotIndex) : ''
        if (!playableExtensions.has(ext)) {
          continue
        }
        files.push({
          name: entry.name,
          handle: entry as FileSystemFileHandle,
          path: lower,
        })

        root.children?.push({
          key,
          label: entry.name,
          data: { handle: entry, path: lower },
          leaf: true,
          icon: 'pi pi-video',
          type: 'file',
          selectable: true,
        })
      }
    }
  }

  const root = {
    key: handle.name,
    label: handle.name,
    type: 'directory',
    children: [],
    selectable: false,
    icon: 'pi pi-folder',
  } satisfies TreeNode

  await walk(handle, root, '')

  pruneEmpty(root)

  return { nodes: [root], files }
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

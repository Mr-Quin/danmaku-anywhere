import { access, lstat, rm, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { err, ok, type Result } from '@danmaku-anywhere/result'
import type { ReleaseManagerError } from './types.js'

const ACTIVE_LINK = 'active'

export function activePath(dataDir: string): string {
  return join(dataDir, ACTIVE_LINK)
}

export function cachePath(dataDir: string, tag: string): string {
  return join(dataDir, 'cache', tag)
}

async function removeLink(link: string): Promise<void> {
  try {
    await lstat(link)
  } catch {
    return
  }
  await rm(link, { recursive: true, force: true })
}

// Chrome may need a manual reload after a repoint. Whether Chrome follows a
// symlink repoint or requires copying into a real directory is pending manual
// browser verification; symlink repoint is the primary path for now.
export async function setActive(
  dataDir: string,
  tag: string
): Promise<Result<string, ReleaseManagerError>> {
  const target = cachePath(dataDir, tag)
  const link = activePath(dataDir)

  try {
    await access(target)
  } catch {
    return err({ kind: 'swap', message: `cache dir for ${tag} is missing` })
  }

  try {
    await removeLink(link)
    await symlink(
      target,
      link,
      process.platform === 'win32' ? 'junction' : 'dir'
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'symlink failed'
    return err({ kind: 'swap', message })
  }

  return ok(link)
}

export async function clearActive(
  dataDir: string
): Promise<Result<void, ReleaseManagerError>> {
  try {
    await removeLink(activePath(dataDir))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'clear failed'
    return err({ kind: 'swap', message })
  }
  return ok(undefined)
}

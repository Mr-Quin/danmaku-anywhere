import { access, cp, lstat, mkdir, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { err, ok, type Result } from '@danmaku-anywhere/result'
import type { ReleaseManagerError } from './types.js'

const ACTIVE_DIR = 'active'

export function activePath(dataDir: string): string {
  return join(dataDir, ACTIVE_DIR)
}

export function cachePath(dataDir: string, tag: string): string {
  return join(dataDir, 'cache', tag)
}

async function ensureRealDir(dir: string): Promise<void> {
  try {
    const stat = await lstat(dir)
    if (stat.isSymbolicLink()) {
      await rm(dir, { force: true })
    }
  } catch {
    // nothing at this path yet
  }
  await mkdir(dir, { recursive: true })
}

async function emptyDir(dir: string): Promise<void> {
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return
  }
  await Promise.all(
    entries.map((entry) => {
      return rm(join(dir, entry), { recursive: true, force: true })
    })
  )
}

// The active folder is a real directory the user loads once in chrome://extensions.
// The build is copied in rather than symlinked: a sandboxed (Flatpak) Chrome reads
// the picked folder through a document portal that does not grant symlink targets,
// so a symlinked active folder fails to resolve its manifest. Swapping replaces the
// directory contents in place so the loaded path stays stable across builds.
export async function setActive(
  dataDir: string,
  tag: string
): Promise<Result<string, ReleaseManagerError>> {
  const target = cachePath(dataDir, tag)
  const dir = activePath(dataDir)

  try {
    await access(target)
  } catch {
    return err({ kind: 'swap', message: `cache dir for ${tag} is missing` })
  }

  try {
    await ensureRealDir(dir)
    await emptyDir(dir)
    await cp(target, dir, { recursive: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'copy failed'
    return err({ kind: 'swap', message })
  }

  return ok(dir)
}

export async function clearActive(
  dataDir: string
): Promise<Result<void, ReleaseManagerError>> {
  try {
    await emptyDir(activePath(dataDir))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'clear failed'
    return err({ kind: 'swap', message })
  }
  return ok(undefined)
}

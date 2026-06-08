import { access, mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { err, ok, type Result } from '@danmaku-anywhere/result'
import { unzipSync } from 'fflate'
import type { CachedBuild, ReleaseAsset, ReleaseManagerError } from './types.js'

const TMP_PREFIX = '.tmp-'

function cacheRoot(dataDir: string): string {
  return join(dataDir, 'cache')
}

function cacheDir(dataDir: string, tag: string): string {
  return join(cacheRoot(dataDir), tag)
}

function tmpDir(dataDir: string, tag: string): string {
  return join(cacheRoot(dataDir), `${TMP_PREFIX}${tag}`)
}

function manifestVersion(bytes: Uint8Array): string | undefined {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as {
      version?: string
    }
    return parsed.version
  } catch {
    return undefined
  }
}

async function writeUnzipped(
  dest: string,
  files: Record<string, Uint8Array>
): Promise<void> {
  for (const [name, bytes] of Object.entries(files)) {
    if (name.endsWith('/')) {
      continue
    }
    const filePath = join(dest, name)
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, bytes)
  }
}

export async function downloadBuild(
  dataDir: string,
  asset: ReleaseAsset,
  fetchImpl: typeof fetch = fetch,
  token?: string
): Promise<Result<CachedBuild, ReleaseManagerError>> {
  const headers: Record<string, string> = {
    Accept: 'application/octet-stream',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetchImpl(asset.assetUrl, { headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'download failed'
    return err({ kind: 'network', message })
  }

  if (!response.ok) {
    return err({
      kind: 'network',
      message: `download responded with ${response.status}`,
    })
  }

  let zipped: Uint8Array
  try {
    zipped = new Uint8Array(await response.arrayBuffer())
  } catch (error) {
    const message = error instanceof Error ? error.message : 'read failed'
    return err({ kind: 'network', message })
  }

  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(zipped)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unzip failed'
    return err({ kind: 'invalid', message })
  }

  const manifest = files['manifest.json']
  if (!manifest) {
    return err({ kind: 'invalid', message: 'archive has no manifest.json' })
  }
  const version = manifestVersion(manifest) ?? asset.version

  const tmp = tmpDir(dataDir, asset.tag)
  const final = cacheDir(dataDir, asset.tag)

  try {
    await rm(tmp, { recursive: true, force: true })
    await mkdir(tmp, { recursive: true })
    await writeUnzipped(tmp, files)
    await rm(final, { recursive: true, force: true })
    await rename(tmp, final)
  } catch (error) {
    await rm(tmp, { recursive: true, force: true }).catch(() => undefined)
    const message = error instanceof Error ? error.message : 'unpack failed'
    return err({ kind: 'swap', message })
  }

  return ok({
    tag: asset.tag,
    version,
    channel: asset.channel,
    downloadedAt: new Date().toISOString(),
  })
}

export async function removeBuild(
  dataDir: string,
  tag: string
): Promise<Result<void, ReleaseManagerError>> {
  try {
    await rm(cacheDir(dataDir, tag), { recursive: true, force: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'remove failed'
    return err({ kind: 'swap', message })
  }
  return ok(undefined)
}

export async function reconcileBuilds(
  dataDir: string,
  index: CachedBuild[]
): Promise<CachedBuild[]> {
  const root = cacheRoot(dataDir)
  try {
    await access(root)
  } catch {
    return []
  }

  const entries = await readdir(root, { withFileTypes: true })
  const present = new Set(
    entries
      .filter((e) => e.isDirectory() && !e.name.startsWith(TMP_PREFIX))
      .map((e) => e.name)
  )

  return index.filter((build) => present.has(build.tag))
}

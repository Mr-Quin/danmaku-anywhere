import { execFile } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import migrationConfig from '../migration.config.json' with { type: 'json' }
import { MIGRATION_EXTENSION_KEY } from './extensionKey'

const execFileAsync = promisify(execFile)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXTENSION_ROOT = path.join(__dirname, '..', '..')
const CACHE_ROOT = path.join(EXTENSION_ROOT, '.e2e-cache', 'prior-releases')

// Source precedence: DA_PRIOR_EXTENSIONS_DIR override (fails closed if set
// but tag missing) -> .e2e-cache -> public download from
// github.com/{repo}/releases/download/{tag}/{asset}. Releases are public,
// no auth needed.
export async function ensurePriorRelease(tag: string): Promise<string> {
  // `tag` flows into fs paths and an `fs.rm -r`; guard against traversal.
  if (!/^v?\d+(\.\d+)*$/.test(tag)) {
    throw new Error(`Invalid prior-release tag: ${tag}`)
  }
  const dir = path.join(CACHE_ROOT, tag)
  const extensionDir = path.join(dir, 'extension')
  const readyMarker = path.join(dir, '.ready')

  const localRoot = process.env.DA_PRIOR_EXTENSIONS_DIR
  if (localRoot) {
    const localSrc = path.join(localRoot, tag.replace(/^v/, ''))
    if (!(await pathExists(path.join(localSrc, 'manifest.json')))) {
      throw new Error(
        `DA_PRIOR_EXTENSIONS_DIR is set but ${localSrc}/manifest.json does not exist. ` +
          'Either unset the env var or add the tagged subdir.'
      )
    }
    // Always re-copy from local source so source edits aren't masked by
    // a stale cache.
    await fs.rm(dir, { recursive: true, force: true })
    await fs.mkdir(extensionDir, { recursive: true })
    await fs.cp(localSrc, extensionDir, { recursive: true })
    await injectKey(path.join(extensionDir, 'manifest.json'))
    await fs.writeFile(readyMarker, 'local')
    return extensionDir
  }

  if (await pathExists(readyMarker)) {
    return extensionDir
  }

  // Stage into a temp dir and atomic-rename so concurrent test workers
  // can't observe a half-extracted cache.
  const stagingDir = `${dir}.staging-${process.pid}-${Date.now()}`
  const stagingExt = path.join(stagingDir, 'extension')
  await fs.mkdir(stagingExt, { recursive: true })

  try {
    const zipName = renderAssetName(tag)
    const zipPath = path.join(stagingDir, zipName)
    await downloadReleaseAsset(tag, zipName, zipPath)
    await unzip(zipPath, stagingExt)
    await injectKey(path.join(stagingExt, 'manifest.json'))
    await fs.unlink(zipPath).catch(() => undefined)
    await fs.writeFile(path.join(stagingDir, '.ready'), tag)

    try {
      await fs.rename(stagingDir, dir)
    } catch {
      if (await pathExists(readyMarker)) {
        await fs.rm(stagingDir, { recursive: true, force: true })
      } else {
        throw new Error(
          `Failed to commit prior-release cache for ${tag}: target dir ${dir} present but unmarked`
        )
      }
    }
  } catch (e) {
    await fs
      .rm(stagingDir, { recursive: true, force: true })
      .catch(() => undefined)
    throw e
  }

  return extensionDir
}

function renderAssetName(tag: string): string {
  return migrationConfig.assetNameTemplate.replace(
    '{version}',
    tag.replace(/^v/, '')
  )
}

async function downloadReleaseAsset(
  tag: string,
  assetName: string,
  destPath: string
): Promise<void> {
  const url = `https://github.com/${migrationConfig.repo}/releases/download/${tag}/${assetName}`
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok || !res.body) {
    throw new Error(`GET ${url} -> HTTP ${res.status}`)
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(destPath))
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function unzip(zipPath: string, destDir: string): Promise<void> {
  if (process.platform === 'win32') {
    // Pass paths via env vars so they don't touch the shell command string.
    await execFileAsync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        'Expand-Archive -Force -Path $env:DA_ZIP_PATH -DestinationPath $env:DA_DEST_PATH',
      ],
      {
        env: {
          ...process.env,
          DA_ZIP_PATH: zipPath,
          DA_DEST_PATH: destDir,
        },
      }
    )
    return
  }
  await execFileAsync('unzip', ['-o', '-q', zipPath, '-d', destDir])
}

async function injectKey(manifestPath: string): Promise<void> {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as {
    key?: string
    version?: string
  }
  manifest.key = MIGRATION_EXTENSION_KEY
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2))
}

// Skips the rm+cp when `build/` hasn't changed since the last call (cheap
// mtime check). Saves 200-800ms per test run when iterating locally.
export async function ensureCurrentBuildForMigration(): Promise<string> {
  const srcBuild = path.join(EXTENSION_ROOT, 'build')
  const srcManifestPath = path.join(srcBuild, 'manifest.json')
  if (!(await pathExists(srcManifestPath))) {
    throw new Error(
      `Current build not found at ${srcBuild}. Run pretest:e2e first.`
    )
  }

  const workerSlot = process.env.PLAYWRIGHT_WORKER_INDEX ?? '0'
  const destRoot = path.join(CACHE_ROOT, `current-${workerSlot}`)
  const destExt = path.join(destRoot, 'extension')
  const stampPath = path.join(destRoot, '.src-mtime')

  const srcMtime = (await fs.stat(srcManifestPath)).mtimeMs.toString()
  const cachedMtime = await fs.readFile(stampPath, 'utf8').catch(() => '')
  if (cachedMtime !== srcMtime) {
    await fs.rm(destRoot, { recursive: true, force: true })
    await fs.mkdir(destExt, { recursive: true })
    await fs.cp(srcBuild, destExt, { recursive: true })
    await fs.writeFile(stampPath, srcMtime)
  }

  // Read SRC each call so the bump is idempotent (cache hits would
  // otherwise read an already-bumped manifest and drift further).
  const manifest = JSON.parse(await fs.readFile(srcManifestPath, 'utf8')) as {
    key?: string
    version?: string
  }
  manifest.key = MIGRATION_EXTENSION_KEY
  manifest.version = bumpForUpdate(manifest.version)
  await fs.writeFile(
    path.join(destExt, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  )

  return destExt
}

// Chrome rejects manifest versions that aren't 1-4 dot-separated integers,
// so a `1.5.0-beta` input would silently fail to load. Reject explicitly.
function bumpForUpdate(version: string | undefined): string {
  if (!version) {
    return '99.0.0'
  }
  if (!/^\d+(\.\d+){0,3}$/.test(version)) {
    throw new Error(
      `Cannot bump non-numeric manifest version: '${version}'. Chrome requires 1 to 4 dot-separated integers.`
    )
  }
  const parts = version.split('.').map((n) => Number.parseInt(n, 10))
  while (parts.length < 4) {
    parts.push(0)
  }
  parts[3] = (parts[3] ?? 0) + 99
  return parts.join('.')
}

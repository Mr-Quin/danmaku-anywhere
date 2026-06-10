import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Refuses to run the suite against a stale or wrong-env build/. The pretest
// hook only fires via `pnpm test:e2e`; a direct `playwright test <spec>`
// silently loads whatever build/ holds, which looks like phantom test results.
// Compares the newest build-input mtime against the timestamp the da:build-info
// vite plugin stamped into build/build-info.json.

const PKG_ROOT = path.join(__dirname, '..', '..')
const BUILD_DIR = path.join(PKG_ROOT, 'build')

// Build inputs only: e2e/ changes never require a rebuild.
const WATCHED = [
  'src',
  'public',
  'manifest.ts',
  'vite.config.ts',
  'package.json',
  'scripts',
]

const REBUILD_HINT =
  'Rebuild with: VITE_DA_ENV=e2e pnpm run build (or run the full suite via pnpm test:e2e). ' +
  'Set DA_E2E_ALLOW_STALE_BUILD=1 to skip this check.'

interface NewestFile {
  filePath: string
  mtimeMs: number
}

function newestMtime(target: string): NewestFile | undefined {
  let stat: ReturnType<typeof statSync>
  try {
    stat = statSync(target)
  } catch {
    return undefined
  }
  if (stat.isFile()) {
    return { filePath: target, mtimeMs: stat.mtimeMs }
  }
  if (!stat.isDirectory()) {
    return undefined
  }
  let entries: string[]
  try {
    entries = readdirSync(target)
  } catch {
    return undefined
  }
  let newest: NewestFile | undefined
  for (const entry of entries) {
    const candidate = newestMtime(path.join(target, entry))
    if (candidate && (!newest || candidate.mtimeMs > newest.mtimeMs)) {
      newest = candidate
    }
  }
  return newest
}

export default function globalSetup(): void {
  if (process.env.DA_E2E_ALLOW_STALE_BUILD) {
    console.warn('[e2e] DA_E2E_ALLOW_STALE_BUILD set, skipping freshness check')
    return
  }

  let info: { daEnv?: string; builtAt?: number }
  try {
    info = JSON.parse(
      readFileSync(path.join(BUILD_DIR, 'build-info.json'), 'utf8')
    )
  } catch {
    throw new Error(
      `[e2e] build/ has no readable build-info.json. ${REBUILD_HINT}`
    )
  }

  if (info.daEnv !== 'e2e') {
    throw new Error(
      `[e2e] build/ was built with VITE_DA_ENV=${info.daEnv}, not e2e. ${REBUILD_HINT}`
    )
  }

  let newest: NewestFile | undefined
  for (const target of WATCHED) {
    const candidate = newestMtime(path.join(PKG_ROOT, target))
    if (candidate && (!newest || candidate.mtimeMs > newest.mtimeMs)) {
      newest = candidate
    }
  }

  if (newest && info.builtAt !== undefined && newest.mtimeMs > info.builtAt) {
    const rel = path.relative(PKG_ROOT, newest.filePath)
    throw new Error(
      `[e2e] build/ is stale: ${rel} changed after the build. ${REBUILD_HINT}`
    )
  }
}

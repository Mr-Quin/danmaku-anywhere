import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const PKG_ROOT = path.join(__dirname, '..', '..')
export const BUILD_DIR = path.join(PKG_ROOT, 'build')

// Build inputs only: e2e/ changes never require a rebuild.
const WATCHED = [
  'src',
  'public',
  'manifest.ts',
  'vite.config.ts',
  'package.json',
  'scripts',
]

export const REBUILD_COMMAND = 'VITE_DA_ENV=e2e pnpm run build'

export const REBUILD_HINT =
  `Rebuild with: ${REBUILD_COMMAND}. ` +
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

export type BuildProblem = 'missing' | 'wrong-env' | 'stale'

export interface BuildCheck {
  ok: boolean
  problem?: BuildProblem
  detail?: string
}

export function checkBuild(): BuildCheck {
  let info: { daEnv?: string; builtAt?: number }
  try {
    info = JSON.parse(
      readFileSync(path.join(BUILD_DIR, 'build-info.json'), 'utf8')
    )
  } catch {
    return {
      ok: false,
      problem: 'missing',
      detail: 'build/ has no readable build-info.json.',
    }
  }

  if (info.daEnv !== 'e2e') {
    return {
      ok: false,
      problem: 'wrong-env',
      detail: `build/ was built with VITE_DA_ENV=${info.daEnv}, not e2e.`,
    }
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
    return {
      ok: false,
      problem: 'stale',
      detail: `build/ is stale: ${rel} changed after the build.`,
    }
  }

  return { ok: true }
}

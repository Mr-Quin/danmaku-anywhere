import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkBuild, PKG_ROOT } from '../e2e/setup/buildFreshness.ts'

// A full build is ~11s whether or not anything changed, so the test tiers ask
// for one only when build/ no longer matches the tree.
export function ensureE2eBuild(): void {
  const check = checkBuild()
  if (check.ok) {
    return
  }
  console.log(`[e2e-build] ${check.detail} Building.`)
  execFileSync('pnpm', ['run', 'build'], {
    cwd: PKG_ROOT,
    stdio: 'inherit',
    env: { ...process.env, VITE_DA_ENV: 'e2e' },
  })
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedDirectly) {
  ensureE2eBuild()
}

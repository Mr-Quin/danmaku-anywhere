#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

interface WorkspacePackage {
  name: string
  path: string
}

// `pnpm -r test` skips a package with no `test` script without saying so, which
// is how a whole app's suite went years without running. Every workspace
// package has to declare one, even if it only passes with no tests yet.
const listed = execFileSync(
  'pnpm',
  ['list', '--recursive', '--depth', '-1', '--json'],
  { encoding: 'utf8' }
)

const workspaceRoot = process.cwd()
const packages = (JSON.parse(listed) as WorkspacePackage[]).filter(
  (pkg) => path.resolve(pkg.path) !== workspaceRoot
)

const offenders = packages.filter((pkg) => {
  const manifest = JSON.parse(
    readFileSync(path.join(pkg.path, 'package.json'), 'utf8')
  ) as { scripts?: Record<string, string> }
  return !manifest.scripts?.test
})

if (offenders.length === 0) {
  console.log(
    `[check-test-scripts] ok: all ${packages.length} workspace packages define a test script.`
  )
  process.exit(0)
}

const report = offenders.map((pkg) => `  - ${pkg.name}`).join('\n')
console.error(
  `[check-test-scripts] These workspace packages define no "test" script, so \`pnpm -r test\` skips them silently:\n${report}\n\nAdd one. A package with nothing to test yet can use "vitest run --passWithNoTests".`
)
process.exit(1)

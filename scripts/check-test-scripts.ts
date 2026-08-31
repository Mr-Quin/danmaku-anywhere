#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

interface WorkspacePackage {
  name: string
  path: string
}

// `pnpm -r test` skips a package with no `test` script without saying so.
const listed = execFileSync(
  'pnpm',
  ['list', '--recursive', '--depth', '-1', '--json'],
  { encoding: 'utf8' }
)

const listedPackages = (JSON.parse(listed) as WorkspacePackage[]).map((pkg) => {
  return { ...pkg, path: path.resolve(pkg.path) }
})

// The listing always includes the workspace root itself, which owns no tests.
// It is the entry every other entry lives under, not wherever this was run from.
const workspaceRoot = listedPackages.reduce((shortest, pkg) => {
  return pkg.path.length < shortest.path.length ? pkg : shortest
}, listedPackages[0])

const packages = listedPackages.filter((pkg) => pkg.path !== workspaceRoot.path)

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

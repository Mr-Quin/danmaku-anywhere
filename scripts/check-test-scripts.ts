#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

interface WorkspacePackage {
  name: string
  path: string
}

const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', 'coverage'])

function hasTestFile(dir: string): boolean {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) {
      continue
    }
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (hasTestFile(full)) {
        return true
      }
    } else if (TEST_FILE.test(entry)) {
      return true
    }
  }
  return false
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

// A package with no test files needs no script. The failure worth catching is
// the opposite one: tests that exist and never run, which is how an entire
// app's suite sat dormant in CI.
const withTests = packages.filter((pkg) => hasTestFile(pkg.path))

const offenders = withTests.filter((pkg) => {
  const manifest = JSON.parse(
    readFileSync(path.join(pkg.path, 'package.json'), 'utf8')
  ) as { scripts?: Record<string, string> }
  return !manifest.scripts?.test
})

if (offenders.length === 0) {
  console.log(
    `[check-test-scripts] ok: all ${withTests.length} workspace packages that contain tests define a test script.`
  )
  process.exit(0)
}

const report = offenders.map((pkg) => `  - ${pkg.name}`).join('\n')
console.error(
  `[check-test-scripts] These workspace packages contain test files but define no "test" script, so \`pnpm -r test\` skips them silently:\n${report}`
)
process.exit(1)

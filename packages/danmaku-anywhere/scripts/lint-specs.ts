import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SPECS_DIR = path.join(__dirname, '..', 'e2e', 'specs')

// A spec earns its cost only by asserting something the user could see. These
// are the observable signals e2e/AGENTS.md names: toast, dialog, rendered DOM,
// a download, or a navigation.
const ALLOW_DIRECTIVE = 'lint-specs-allow-state-only:'

const UI_SIGNALS = [
  '.toast',
  '.dialog',
  'commentElements',
  'expectCommentCount',
  'toBeVisible',
  'toBeAttached',
  'toBeHidden',
  'toContainText',
  'toHaveText',
  'toHaveValue',
  'toHaveURL',
  'toHaveTitle',
  'toHaveCount',
  'toBeChecked',
  'toBeEnabled',
  'toBeDisabled',
  "waitForEvent('download'",
  'waitForURL',
]

function specFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir)) {
    // Scratch specs are verification scaffolding, not committed coverage.
    if (entry === '.scratch') {
      continue
    }
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) {
      found.push(...specFiles(full))
    } else if (entry.endsWith('.spec.ts')) {
      found.push(full)
    }
  }
  return found
}

const offenders: string[] = []
for (const file of specFiles(SPECS_DIR)) {
  const source = readFileSync(file, 'utf8')
  if (!source.includes('expect(')) {
    continue
  }
  // Some behavior has no UI surface at all (storage scoping, cache identity).
  // Those specs opt out by naming the reason, the same way a spec justifies an
  // expectedConsoleErrors entry.
  if (source.includes(ALLOW_DIRECTIVE)) {
    continue
  }
  if (UI_SIGNALS.some((signal) => source.includes(signal))) {
    continue
  }
  offenders.push(path.relative(path.join(__dirname, '..'), file))
}

if (offenders.length === 0) {
  console.log(`[lint-specs] ${'ok'}: every spec asserts a user-visible signal.`)
  process.exit(0)
}

const report = offenders.map((file) => `  - ${file}`).join('\n')
const message = `[lint-specs] These specs assert only on state, with no user-visible signal:\n${report}\n\nAdd a toast, dialog, DOM, download, or navigation assertion, or move the test down a layer (see e2e/AGENTS.md).\nIf the behavior genuinely has no UI surface, add a comment naming the reason: ${ALLOW_DIRECTIVE} <why>`

// Locally this blocks the loop that produced the spec. In CI it only annotates,
// so an outside contributor is never gated on a convention they cannot see.
if (process.env.CI) {
  console.warn(message)
  process.exit(0)
}
console.error(message)
process.exit(1)

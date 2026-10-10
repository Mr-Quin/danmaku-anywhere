import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const SPECS_DIR = path.join(ROOT, 'e2e', 'specs')
const SRC_DIR = path.join(ROOT, 'src')

// A spec earns its cost only by asserting something the user could see. These
// are the observable signals e2e/AGENTS.md names: toast, dialog, rendered DOM,
// a download, or a navigation.
const ALLOW_STATE_ONLY_DIRECTIVE = 'lint-specs-allow-state-only:'

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

function filesUnder(
  dir: string,
  matches: (entry: string) => boolean
): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir)) {
    // Scratch specs are verification scaffolding, not committed coverage.
    if (entry === '.scratch') {
      continue
    }
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) {
      found.push(...filesUnder(full, matches))
    } else if (matches(entry)) {
      found.push(full)
    }
  }
  return found
}

function checkStateOnlySpecs(): string[] {
  const offenders: string[] = []
  for (const file of filesUnder(SPECS_DIR, (entry) =>
    entry.endsWith('.spec.ts')
  )) {
    const source = readFileSync(file, 'utf8')
    if (!source.includes('expect(')) {
      continue
    }
    // Some behavior has no UI surface at all (storage scoping, cache identity).
    // Those specs opt out by naming the reason, the same way a spec justifies an
    // expectedConsoleErrors entry.
    if (source.includes(ALLOW_STATE_ONLY_DIRECTIVE)) {
      continue
    }
    if (UI_SIGNALS.some((signal) => source.includes(signal))) {
      continue
    }
    offenders.push(path.relative(ROOT, file))
  }
  return offenders
}

// A double that stands in for a collaborator should be typed so a rename or
// signature change fails at compile time. `as unknown as X` bypasses that.
// Each occurrence documents its exception inline, the same directive style as
// the state-only-spec opt-out above.
const ALLOW_CAST_DIRECTIVE = 'lint-specs-allow-cast:'
const ALLOW_CALL_ONLY_DIRECTIVE = 'lint-specs-allow-call-only:'
const ALLOW_UNUSED_MOCK_DIRECTIVE = 'lint-specs-allow-unused-mock:'

const CALL_ONLY_MATCHER =
  /^((?:rejects|resolves)\.)?(not\.)?toHaveBeenCalled\w*$|^((?:rejects|resolves)\.)?(not\.)?toHaveBeenLastCalledWith$|^((?:rejects|resolves)\.)?(not\.)?toHaveBeenNthCalledWith$/

function unitTestFiles(): string[] {
  return filesUnder(SRC_DIR, (entry) => entry.endsWith('.test.ts'))
}

function checkUnknownCasts(file: string, source: string): string | null {
  const offendingLines = source
    .split('\n')
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(({ line }) => line.includes('as unknown as'))
    .filter(({ line }) => !line.includes(ALLOW_CAST_DIRECTIVE))

  if (offendingLines.length === 0) {
    return null
  }
  const lines = offendingLines.map(({ number }) => number).join(', ')
  return `${path.relative(ROOT, file)}: 'as unknown as' on line(s) ${lines} with no ${ALLOW_CAST_DIRECTIVE} directive`
}

function checkCallOnlyAssertions(file: string, source: string): string | null {
  if (source.includes(ALLOW_CALL_ONLY_DIRECTIVE)) {
    return null
  }
  const matcherNames = [
    ...source.matchAll(
      /expect\([^;]*?\)\s*\.\s*((?:(?:rejects|resolves)\.)?(?:not\.)?\w+)\(/gs
    ),
  ].map((match) => match[1])

  if (matcherNames.length === 0) {
    return null
  }
  if (!matcherNames.every((name) => CALL_ONLY_MATCHER.test(name))) {
    return null
  }
  return `${path.relative(ROOT, file)}: every assertion is toHaveBeenCalled*, nothing asserts real behavior`
}

// A vi.mock is legitimate when it replaces what the code under test sees on
// its own import, even though the test file itself never imports the mocked
// module directly. So "never imports" is checked against the test file plus
// whatever it pulls in via relative imports (the SUT and its neighbors), not
// the test file in isolation.
function resolveRelativeImport(
  fromFile: string,
  specifier: string
): string | null {
  if (!specifier.startsWith('.')) {
    return null
  }
  const base = path.resolve(path.dirname(fromFile), specifier)
  for (const candidate of [
    base + '.ts',
    base + '.tsx',
    path.join(base, 'index.ts'),
  ]) {
    try {
      if (statSync(candidate).isFile()) {
        return candidate
      }
    } catch {
      // candidate doesn't exist, try the next one
    }
  }
  return null
}

function checkUnusedMocks(file: string, source: string): string | null {
  if (source.includes(ALLOW_UNUSED_MOCK_DIRECTIVE)) {
    return null
  }
  const mockedModules = [
    ...source.matchAll(/vi\.mock\(\s*['"]([^'"]+)['"]/g),
  ].map((match) => match[1])

  if (mockedModules.length === 0) {
    return null
  }

  const relativeImports = [
    ...source.matchAll(/from\s+['"](\.[^'"]+)['"]/g),
    ...source.matchAll(/import\(\s*['"](\.[^'"]+)['"]/g),
  ].map((match) => match[1])
  const context = [source]
  for (const specifier of relativeImports) {
    const resolved = resolveRelativeImport(file, specifier)
    if (resolved) {
      context.push(readFileSync(resolved, 'utf8'))
    }
  }
  const searchable = context.join('\n')

  const unused = mockedModules.filter((modulePath) => {
    const escaped = modulePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const importPattern = new RegExp(
      `from\\s+['"]${escaped}['"]|import\\(\\s*['"]${escaped}['"]`
    )
    return !importPattern.test(searchable)
  })

  if (unused.length === 0) {
    return null
  }
  return `${path.relative(ROOT, file)}: vi.mock('${unused.join("'), vi.mock('")}') mocks a module neither this file nor the code under test imports`
}

function checkUnitTests(): string[] {
  const offenders: string[] = []
  for (const file of unitTestFiles()) {
    const source = readFileSync(file, 'utf8')
    for (const check of [
      checkUnknownCasts,
      checkCallOnlyAssertions,
      checkUnusedMocks,
    ]) {
      const offense = check(file, source)
      if (offense) {
        offenders.push(offense)
      }
    }
  }
  return offenders
}

const stateOnlySpecOffenders = checkStateOnlySpecs()
const unitTestOffenders = checkUnitTests()

if (stateOnlySpecOffenders.length === 0 && unitTestOffenders.length === 0) {
  console.log(
    '[lint-specs] ok: specs assert user-visible signals, unit test doubles are typed.'
  )
  process.exit(0)
}

const messages: string[] = []
if (stateOnlySpecOffenders.length > 0) {
  const report = stateOnlySpecOffenders.map((file) => `  - ${file}`).join('\n')
  messages.push(
    `These specs assert only on state, with no user-visible signal:\n${report}\n\nAdd a toast, dialog, DOM, download, or navigation assertion, or move the test down a layer (see e2e/AGENTS.md).\nIf the behavior genuinely has no UI surface, add a comment naming the reason: ${ALLOW_STATE_ONLY_DIRECTIVE} <why>`
  )
}
if (unitTestOffenders.length > 0) {
  const report = unitTestOffenders.map((entry) => `  - ${entry}`).join('\n')
  messages.push(
    `These unit tests need a typed double, a real assertion, or an honest mock:\n${report}\n\nReplace 'as unknown as' with 'satisfies Pick<X, ...>', or use createTestContainer. Assert behavior, not just that a collaborator was called. Remove a mock the file never imports.\nIf a specific case is a genuine exception, add a comment naming the reason: ${ALLOW_CAST_DIRECTIVE} / ${ALLOW_CALL_ONLY_DIRECTIVE} / ${ALLOW_UNUSED_MOCK_DIRECTIVE} <why>`
  )
}
const message = `[lint-specs] ${messages.join('\n\n')}`

// Locally this blocks the loop that produced the spec or test. In CI it only
// annotates, so an outside contributor is never gated on a convention they
// cannot see.
if (process.env.CI) {
  console.warn(message)
  process.exit(0)
}
console.error(message)
process.exit(1)

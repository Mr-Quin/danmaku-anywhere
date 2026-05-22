#!/usr/bin/env node
// Bootstrap a /da-dev worktree from an existing ClickUp task.
//
// Usage:
//   node scripts/da-bootstrap.mjs --task DA-XXX --hint <kebab-name> --type <extension|app|proxy|chore|docs>
//
// Side effects (in order):
//   1. git fetch origin master
//   2. git worktree add ../danmaku-anywhere-<task>-<hint> -b <task>_<hint> origin/master
//   3. copy packages/danmaku-anywhere/.env{,.local} into the worktree
//   4. pnpm install + pnpm build:packages inside the worktree
//   5. write task notes to ~/.claude/da-tasks/<task>.md (centralized, not in repo)
//   6. print the `wt new-tab` invocation for a fresh Claude session
//
// The ClickUp task itself is NOT created here — create it via the ClickUp MCP
// first, then pass its custom ID via --task.

import { execSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

const VALID_TYPES = new Set(['extension', 'app', 'proxy', 'chore', 'docs'])
const ENV_FILES = [
  'packages/danmaku-anywhere/.env',
  'packages/danmaku-anywhere/.env.local',
]

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith('--')) {
      continue
    }
    const key = arg.slice(2)
    const value = argv[i + 1]
    if (!value || value.startsWith('--')) {
      out[key] = true
    } else {
      out[key] = value
      i++
    }
  }
  return out
}

function die(msg) {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

function step(msg) {
  console.log(`→ ${msg}`)
}

function run(cmd, args, opts = {}) {
  // Node 22 deprecates passing an args array together with shell:true
  // (DEP0190). On Windows we need shell:true to find `pnpm.cmd`, so collapse
  // to a single command string in that path.
  const r =
    opts.shell === true
      ? spawnSync([cmd, ...args].join(' '), { stdio: 'inherit', ...opts })
      : spawnSync(cmd, args, { stdio: 'inherit', ...opts })
  if (r.status !== 0) {
    die(`command failed: ${cmd} ${args.join(' ')}`)
  }
}

const args = parseArgs(process.argv.slice(2))
const task = args.task
const hint = args.hint
const type = args.type

if (!task || !/^DA-\d+$/.test(task)) {
  die('missing or malformed --task (expected DA-XXX)')
}
if (!hint || !/^[a-z0-9]+(-[a-z0-9]+){0,4}$/.test(hint)) {
  die('missing or malformed --hint (expected 1-5 kebab-case segments)')
}
if (!type || !VALID_TYPES.has(type)) {
  die(`missing or invalid --type (one of: ${[...VALID_TYPES].join(', ')})`)
}

// Locate the *main* worktree, not the current one — if we run from a linked
// worktree, --show-toplevel would point at that worktree and new worktrees
// would land scattered next to it. --git-common-dir returns the shared .git
// directory; its parent is the main worktree.
const gitCommonDir = path.resolve(
  execSync('git rev-parse --git-common-dir', { encoding: 'utf8' }).trim()
)
const mainRepoRoot = path.dirname(gitCommonDir)
process.chdir(mainRepoRoot)

const branch = `${task}_${hint.replace(/-/g, '_')}`
const worktreeDir = path.join(
  path.dirname(mainRepoRoot),
  `${path.basename(mainRepoRoot)}-${task}-${hint}`
)

if (fs.existsSync(worktreeDir)) {
  die(`worktree dir already exists: ${worktreeDir}`)
}

step('fetching origin/master')
run('git', ['fetch', 'origin', 'master'])

step(`creating worktree at ${worktreeDir} on branch ${branch}`)
run('git', ['worktree', 'add', worktreeDir, '-b', branch, 'origin/master'])

step('copying env files')
for (const rel of ENV_FILES) {
  const src = path.join(mainRepoRoot, rel)
  if (fs.existsSync(src)) {
    const dst = path.join(worktreeDir, rel)
    fs.mkdirSync(path.dirname(dst), { recursive: true })
    fs.copyFileSync(src, dst)
    console.log(`  ${rel}`)
  }
}

step('pnpm install (worktree)')
run('pnpm', ['install'], {
  cwd: worktreeDir,
  shell: process.platform === 'win32',
})

step('pnpm build:packages (worktree)')
run('pnpm', ['build:packages'], {
  cwd: worktreeDir,
  shell: process.platform === 'win32',
})

const tasksDir = path.join(os.homedir(), '.claude', 'da-tasks')
fs.mkdirSync(tasksDir, { recursive: true })
const taskFile = path.join(tasksDir, `${task}.md`)
step(`writing ${taskFile}`)
fs.writeFileSync(
  taskFile,
  `---
task: ${task}
type: ${type}
branch: ${branch}
worktree: ${worktreeDir}
---

Execute the da-dev workflow starting from step 3 (Implement).
Read \`.claude/commands/da-dev.md\` for the full workflow.
Steps 1–2 are already complete.
`
)

const claudeCmd = `claude --permission-mode acceptEdits --add-dir . "Read ${taskFile} and follow the instructions"`

console.log()
console.log(`✓ Worktree:   ${worktreeDir}`)
console.log(`✓ Branch:     ${branch}`)
console.log(`✓ Task notes: ${taskFile}`)
console.log()
console.log('Open a new Claude session in the worktree:')
console.log()
console.log(`  cd "${worktreeDir}"`)
console.log(`  ${claudeCmd}`)
console.log()

if (process.platform === 'win32') {
  const wtArgs = [
    'new-tab',
    '--title',
    `${task}: ${hint}`,
    '-d',
    worktreeDir,
    '--',
    'powershell',
    '-NoExit',
    '-Command',
    claudeCmd,
  ]
  console.log('Windows Terminal one-liner:')
  console.log()
  console.log(
    '  wt ' + wtArgs.map((a) => (a.includes(' ') ? `'${a}'` : a)).join(' ')
  )
  console.log()
}

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { BUILD_DIR, checkBuild, PKG_ROOT } from '../e2e/setup/buildFreshness.ts'
import { ensureE2eBuild } from './ensureE2eBuild.ts'

const CLI_VERSION = '@playwright/cli@0.1.18'
const OUT_DIR = path.join(PKG_ROOT, '.playwright-cli')
const CONFIG_PATH = path.join(OUT_DIR, 'cli.config.json')

function fail(message: string): never {
  console.error(`\n[preflight] ${message}\n`)
  process.exit(1)
}

// The agent lane must not explore a build that does not match the tree, so an
// unambiguous problem is repaired and anything else stops the run.
ensureE2eBuild()
const check = checkBuild()
if (!check.ok) {
  fail(`build/ still unusable after a build: ${check.detail}`)
}

// A build directory outside this checkout means the caller is driving another
// worktree's artifact, which no rebuild here can fix.
if (!BUILD_DIR.startsWith(PKG_ROOT + path.sep)) {
  fail(`build/ resolves outside this package: ${BUILD_DIR}`)
}

const executablePath = chromium.executablePath()
if (!existsSync(executablePath)) {
  fail(
    `Chromium is missing at ${executablePath}. Install it with: pnpm exec playwright install chromium`
  )
}

// Chromium refuses to start as root without this, which is how the agent lane
// runs in a container.
const sandboxArgs = process.getuid?.() === 0 ? ['--no-sandbox'] : []

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(
  CONFIG_PATH,
  `${JSON.stringify(
    {
      browser: {
        browserName: 'chromium',
        launchOptions: {
          executablePath,
          headless: true,
          args: [
            ...sandboxArgs,
            // Unlocks the CDP Extensions domain so the extension can be
            // reloaded in place after a rebuild.
            '--enable-unsafe-extension-debugging',
            `--disable-extensions-except=${BUILD_DIR}`,
            `--load-extension=${BUILD_DIR}`,
          ],
        },
      },
    },
    null,
    2
  )}\n`
)

// A fresh session name per run keeps the profile disposable. Reusing one lets a
// wedged extension survive into the next run, which reads as "the SW is gone".
const session = `verify-${Date.now()}`

console.log(`
[preflight] build/ is fresh, chromium resolved, config written.

  config:   ${path.relative(process.cwd(), CONFIG_PATH)}
  chromium: ${executablePath}

Explore (each block is one shell command):

  npx -y ${CLI_VERSION} -s=${session} open --persistent --config=${CONFIG_PATH} about:blank
  npx -y ${CLI_VERSION} -s=${session} goto <url>
  npx -y ${CLI_VERSION} -s=${session} snapshot
  npx -y ${CLI_VERSION} -s=${session} generate-locator <ref>
  npx -y ${CLI_VERSION} -s=${session} close

Seed through the dev API on the service worker:

  npx -y ${CLI_VERSION} -s=${session} run-code "async page => page.context().serviceWorkers()[0].evaluate(() => globalThis.__da.describe())"
`)

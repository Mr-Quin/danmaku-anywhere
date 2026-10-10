import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { BrowserContext, TestInfo } from '@playwright/test'
import migrationConfig from '../migration.config.json' with { type: 'json' }
import { mockCatalog } from '../network/catalog'
import { attachConsoleWatcher, type ConsoleWatcher } from './console-watcher'
import {
  ensureCurrentBuildForMigration,
  ensurePriorRelease,
} from './priorRelease'
import { launchExtension } from './swapExtension'

export interface PriorInstall {
  context: BrowserContext
  consoleWatcher: ConsoleWatcher
  currentExt: string
  tmpRoot: string
}

// LogService IDB-quirk noise, unrelated to migration.
const IGNORED_ERROR_PATTERNS = [/Failed to save log/]

export function migrationErrors(watcher: ConsoleWatcher): string[] {
  return watcher.getErrors().filter((e) => {
    return !IGNORED_ERROR_PATTERNS.some((p) => p.test(e))
  })
}

// The user_data_dir lives under os.tmpdir() because Chrome's IDB breaks on
// Windows paths past MAX_PATH.
export async function withPriorInstall(
  testInfo: TestInfo,
  body: (install: PriorInstall) => Promise<void>
): Promise<void> {
  const tmpRoot = path.join(
    os.tmpdir(),
    `da-mig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  )
  testInfo.annotations.push({ type: 'tmpRoot', description: tmpRoot })
  const userDataDir = path.join(tmpRoot, 'profile')
  await fs.mkdir(userDataDir, { recursive: true })

  const [priorExt, currentExt] = await Promise.all([
    ensurePriorRelease(migrationConfig.baselinePriorTag),
    ensureCurrentBuildForMigration(),
  ])

  let context: BrowserContext | undefined
  try {
    context = await launchExtension(userDataDir, priorExt)
    const consoleWatcher = attachConsoleWatcher(context)
    await stubReleaseNotes(context)
    const catalog = mockCatalog()
    await context.route(catalog.pattern, catalog.respond)
    // The current backup page mounts the cloud-backup section, which reads the
    // auth session. Answer "signed out" instead of reaching the backend.
    await context.route('**/auth/get-session*', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'null',
      })
    })
    await body({ context, consoleWatcher, currentExt, tmpRoot })
  } finally {
    await context?.close().catch(() => undefined)
    // After context.close() so Windows has released the profile's handles.
    await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => {
      return undefined
    })
  }
}

// Both popups fetch the GitHub releases API on open; unauthenticated on CI that
// call hits a rate limit (403) that trips the console watcher. Stub only that
// route: a blanket egress block hangs the legacy popup.
async function stubReleaseNotes(context: BrowserContext): Promise<void> {
  await context.route(
    /api\.github\.com\/repos\/[^/]+\/[^/]+\/releases\//,
    (route) => {
      return route.fulfill({
        json: {
          name: '',
          body: '',
          html_url: 'https://release.invalid',
          published_at: '2020-01-01T00:00:00Z',
        },
      })
    }
  )
}

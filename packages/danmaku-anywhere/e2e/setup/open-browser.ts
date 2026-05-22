import crypto from 'node:crypto'
import { chromium } from '@playwright/test'
import { execSync } from 'child_process'
import fs from 'fs'
import net from 'net'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// e2e/setup/open-browser.ts → ../..
const EXTENSION_ROOT = path.join(__dirname, '..', '..')
const DEV_BUILD_PATH = path.join(EXTENSION_ROOT, 'dev', 'chrome')
const PROD_BUILD_PATH = path.join(EXTENSION_ROOT, 'build')
const USER_DATA_DIR = path.join(EXTENSION_ROOT, '.playwright-profile')
const WEB_APP_URL = 'https://danmaku.weeblify.app/local'
const BUILD_TIMEOUT_MS = 30_000
const BUILD_POLL_MS = 500

const useBuild = process.argv.includes('--build')

async function findFreePort(): Promise<number> {
  const { promise, resolve, reject } = Promise.withResolvers<number>()
  const srv = net.createServer()
  srv.listen(0, () => {
    const addr = srv.address()
    if (addr && typeof addr === 'object') {
      srv.close(() => resolve(addr.port))
    } else {
      reject(new Error('Failed to get port'))
    }
  })
  srv.on('error', reject)
  return promise
}

function resolvePort(): number | Promise<number> {
  const env = process.env.VITE_PORT
  if (!env) {
    return findFreePort()
  }
  const parsed = Number.parseInt(env, 10)
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid VITE_PORT: ${env}`)
  }
  return parsed
}

async function waitForFile(filePath: string, timeoutMs: number): Promise<void> {
  if (fs.existsSync(filePath)) {
    return
  }
  console.log(`Waiting for ${path.basename(filePath)}...`)
  const { promise, resolve, reject } = Promise.withResolvers<void>()
  const start = Date.now()
  const interval = setInterval(() => {
    if (fs.existsSync(filePath)) {
      clearInterval(interval)
      resolve()
    } else if (Date.now() - start > timeoutMs) {
      clearInterval(interval)
      reject(new Error(`Timeout waiting for ${filePath} (${timeoutMs}ms)`))
    }
  }, BUILD_POLL_MS)
  return promise
}

// Mirrors Chrome's Extension::GenerateIdForPath: SHA-256 of the absolute
// extension path (UTF-16LE on Windows, UTF-8 elsewhere), first 16 bytes
// converted from hex (0-f) to letters (a-p).
function computeExtensionIdFromPath(extensionPath: string): string {
  const absPath = path.resolve(extensionPath)
  const bytes =
    process.platform === 'win32'
      ? Buffer.from(absPath, 'utf16le')
      : Buffer.from(absPath, 'utf8')
  const hex = crypto
    .createHash('sha256')
    .update(bytes)
    .digest('hex')
    .slice(0, 32)
  const aCode = 'a'.charCodeAt(0)
  let id = ''
  for (const c of hex) {
    id += String.fromCharCode(aCode + Number.parseInt(c, 16))
  }
  return id
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readPreferences(prefsPath: string): Record<string, unknown> | null {
  if (!fs.existsSync(prefsPath)) {
    return {}
  }
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(prefsPath, 'utf8'))
    return isPlainObject(parsed) ? parsed : null
  } catch {
    return null
  }
}

function setNested(
  root: Record<string, unknown>,
  pathSegments: string[],
  value: unknown
): void {
  let cursor: Record<string, unknown> = root
  for (let i = 0; i < pathSegments.length - 1; i++) {
    const key = pathSegments[i]
    const next = cursor[key]
    if (!isPlainObject(next)) {
      cursor[key] = {}
    }
    cursor = cursor[key] as Record<string, unknown>
  }
  cursor[pathSegments[pathSegments.length - 1]] = value
}

function getNested(
  root: Record<string, unknown>,
  pathSegments: string[]
): unknown {
  let cursor: unknown = root
  for (const key of pathSegments) {
    if (!isPlainObject(cursor)) {
      return undefined
    }
    cursor = cursor[key]
  }
  return cursor
}

function configureChromePreferences(
  extensionId: string,
  stalePredictedId?: string
): void {
  const defaultDir = path.join(USER_DATA_DIR, 'Default')
  fs.mkdirSync(defaultDir, { recursive: true })
  const prefsPath = path.join(defaultDir, 'Preferences')

  const prefs = readPreferences(prefsPath)
  if (prefs === null) {
    // Existing file is unreadable — leave it alone rather than overwriting
    // with our minimal version. Chrome resets corrupt prefs on launch anyway.
    console.warn(
      `Preferences at ${prefsPath} is unreadable; skipping pre-launch config.`
    )
    return
  }
  setNested(prefs, ['extensions', 'ui', 'developer_mode'], true)

  const pinned = getNested(prefs, ['extensions', 'pinned_extensions'])
  const pinnedArr = Array.isArray(pinned) ? (pinned as string[]) : []
  const cleaned =
    stalePredictedId !== undefined && stalePredictedId !== extensionId
      ? pinnedArr.filter((id) => id !== stalePredictedId)
      : pinnedArr
  if (!cleaned.includes(extensionId)) {
    cleaned.push(extensionId)
  }
  setNested(prefs, ['extensions', 'pinned_extensions'], cleaned)

  fs.writeFileSync(prefsPath, JSON.stringify(prefs))
}

// extensions.ui.developer_mode is a "tracked" pref — Chrome verifies an HMAC
// in Secure Preferences and discards unsigned writes. The only way to set it
// without the per-profile signing key is to ask chrome://extensions to do it
// for us via the chrome.developerPrivate API, which Chrome signs itself.
async function enableExtensionDeveloperMode(
  context: Awaited<ReturnType<typeof chromium.launchPersistentContext>>
): Promise<void> {
  const page = await context.newPage()
  try {
    await page.goto('chrome://extensions/')
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const api = (
            globalThis as {
              chrome?: {
                developerPrivate?: {
                  updateProfileConfiguration: (
                    update: { inDeveloperMode: boolean },
                    cb: () => void
                  ) => void
                }
                runtime?: { lastError?: { message?: string } }
              }
            }
          ).chrome
          if (!api?.developerPrivate) {
            reject(new Error('chrome.developerPrivate not available'))
            return
          }
          api.developerPrivate.updateProfileConfiguration(
            { inDeveloperMode: true },
            () => {
              const err = api.runtime?.lastError
              if (err) {
                reject(new Error(err.message ?? 'unknown error'))
              } else {
                resolve()
              }
            }
          )
        })
    )
  } catch (err) {
    console.warn(
      'Could not enable extension developer mode:',
      err instanceof Error ? err.message : err
    )
  } finally {
    await page.close().catch(() => undefined)
  }
}

async function openBrowser(
  extensionPath: string,
  cleanup?: () => Promise<void>
): Promise<void> {
  await using stack = new AsyncDisposableStack()
  if (cleanup) {
    stack.defer(cleanup)
  }

  const expectedExtensionId = computeExtensionIdFromPath(extensionPath)
  configureChromePreferences(expectedExtensionId)

  console.log('Opening browser...')
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    channel: 'chromium',
    headless: false,
    viewport: null,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  })
  stack.defer(async () => {
    await context.close().catch(() => undefined)
  })

  let [serviceWorker] = context.serviceWorkers()
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker')
  }
  const extensionId = serviceWorker.url().split('/')[2]

  if (extensionId !== expectedExtensionId) {
    console.warn(
      `Extension ID mismatch — predicted ${expectedExtensionId}, got ${extensionId}. Repinning on next launch...`
    )
    configureChromePreferences(extensionId, expectedExtensionId)
  }

  await enableExtensionDeveloperMode(context)

  const page = await context.newPage()
  await page.goto(WEB_APP_URL)

  console.log(`\nExtension loaded: ${extensionId}`)
  console.log(`Popup: chrome-extension://${extensionId}/pages/popup.html`)
  console.log(
    `Dashboard: chrome-extension://${extensionId}/pages/dashboard.html`
  )

  if (!useBuild) {
    console.log('HMR is active. Close the browser window to stop.')
  } else {
    console.log('Running production build. Close the browser window to stop.')
  }

  const { promise: waitForClose, resolve: onClose } =
    Promise.withResolvers<void>()
  context.once('close', () => onClose())
  process.once('SIGINT', () => onClose())

  await waitForClose
  console.log('Shutting down...')
}

async function startDev(): Promise<void> {
  const { createServer } = await import('vite')

  const port = await resolvePort()
  // vite.config.ts reads VITE_PORT for its define constants; bake the
  // resolved port back in so the bundle matches the actual bound port.
  process.env.VITE_PORT = port.toString()
  console.log(`Starting Vite dev server on port ${port}...`)

  const server = await createServer({
    configFile: path.join(EXTENSION_ROOT, 'vite.config.ts'),
    server: { port, strictPort: true, hmr: { clientPort: port } },
  })

  await server.listen()
  console.log(`Vite dev server ready on port ${port}`)

  await waitForFile(
    path.join(DEV_BUILD_PATH, 'manifest.json'),
    BUILD_TIMEOUT_MS
  )

  await openBrowser(DEV_BUILD_PATH, async () => {
    await server.close()
  })
}

async function startBuild(): Promise<void> {
  console.log('Building extension...')
  execSync('pnpm build', { cwd: EXTENSION_ROOT, stdio: 'inherit' })

  await openBrowser(PROD_BUILD_PATH)
}

async function main(): Promise<void> {
  if (useBuild) {
    await startBuild()
  } else {
    await startDev()
  }
}

await main()

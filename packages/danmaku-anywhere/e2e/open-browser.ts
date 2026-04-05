/**
 * Single-command dev verification: starts a Vite dev server on a free port,
 * then opens Chromium with the extension dev build loaded.
 *
 * Usage: pnpm open-browser
 * Override port: VITE_PORT=23335 pnpm open-browser
 */
import { chromium } from '@playwright/test'
import fs from 'fs'
import net from 'net'
import path from 'path'
import { fileURLToPath } from 'url'
import { createServer } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXTENSION_ROOT = path.join(__dirname, '..')
const DEV_BUILD_PATH = path.join(EXTENSION_ROOT, 'dev', 'chrome')
const USER_DATA_DIR = path.join(EXTENSION_ROOT, '.playwright-profile')
const WEB_APP_URL = 'https://danmaku.weeblify.app/local'
const BUILD_TIMEOUT_MS = 30_000
const BUILD_POLL_MS = 500

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

function ensureDeveloperMode(): void {
  const defaultDir = path.join(USER_DATA_DIR, 'Default')
  fs.mkdirSync(defaultDir, { recursive: true })
  const prefsPath = path.join(defaultDir, 'Preferences')
  if (!fs.existsSync(prefsPath)) {
    fs.writeFileSync(
      prefsPath,
      JSON.stringify({ extensions: { ui: { developer_mode: true } } })
    )
  }
}

async function main(): Promise<void> {
  const port = await resolvePort()
  console.log(`Starting Vite dev server on port ${port}...`)

  const server = await createServer({
    configFile: path.join(EXTENSION_ROOT, 'vite.config.ts'),
    server: { port, strictPort: true, hmr: { clientPort: port } },
  })

  await using stack = new AsyncDisposableStack()
  stack.defer(async () => {
    await server.close()
  })

  await server.listen()
  console.log(`Vite dev server ready on port ${port}`)

  await waitForFile(
    path.join(DEV_BUILD_PATH, 'manifest.json'),
    BUILD_TIMEOUT_MS
  )

  ensureDeveloperMode()

  console.log('Opening browser...')
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    channel: 'chromium',
    headless: false,
    viewport: null,
    args: [
      `--disable-extensions-except=${DEV_BUILD_PATH}`,
      `--load-extension=${DEV_BUILD_PATH}`,
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

  const page = await context.newPage()
  await page.goto(WEB_APP_URL)

  console.log(`\nExtension loaded: ${extensionId}`)
  console.log(`Popup: chrome-extension://${extensionId}/pages/popup.html`)
  console.log(
    `Dashboard: chrome-extension://${extensionId}/pages/dashboard.html`
  )
  console.log('HMR is active. Close the browser window to stop.')

  const { promise: waitForClose, resolve: onClose } =
    Promise.withResolvers<void>()
  context.once('close', () => onClose())
  process.once('SIGINT', () => onClose())

  await waitForClose
  console.log('Shutting down...')
}

await main()

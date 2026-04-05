/**
 * Single-command dev verification: starts a Vite dev server on a free port,
 * then opens Chromium with the extension dev build loaded.
 *
 * Usage: pnpm open-browser
 */
import { chromium } from '@playwright/test'
import fs from 'fs'
import net from 'net'
import path from 'path'
import { fileURLToPath } from 'url'
import { createServer } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const extensionRoot = path.join(__dirname, '..')
const devBuildPath = path.join(extensionRoot, 'dev', 'chrome')
const userDataDir = path.join(extensionRoot, '.playwright-profile')

function getRandomPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(0, () => {
      const address = server.address()
      if (address && typeof address === 'object') {
        const port = address.port
        server.close(() => {
          return resolve(port)
        })
      } else {
        reject(new Error('Failed to get random port'))
      }
    })
    server.on('error', reject)
  })
}

// Start Vite dev server programmatically
const port = await getRandomPort()
console.log(`Starting Vite dev server on port ${port}...`)

const server = await createServer({
  configFile: path.join(extensionRoot, 'vite.config.ts'),
  server: {
    port,
    strictPort: true,
    hmr: { clientPort: port },
  },
})
await server.listen()
console.log(`Vite dev server ready on port ${port}`)

// Wait for crxjs to write the dev build
if (!fs.existsSync(path.join(devBuildPath, 'manifest.json'))) {
  console.log('Waiting for extension dev build...')
  await new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      if (fs.existsSync(path.join(devBuildPath, 'manifest.json'))) {
        clearInterval(interval)
        resolve()
      }
    }, 500)
  })
}

// Set up persistent profile with developer mode
fs.mkdirSync(path.join(userDataDir, 'Default'), { recursive: true })
const prefsPath = path.join(userDataDir, 'Default', 'Preferences')
if (!fs.existsSync(prefsPath)) {
  fs.writeFileSync(
    prefsPath,
    JSON.stringify({
      extensions: {
        ui: { developer_mode: true },
      },
    })
  )
}

// Open browser
console.log('Opening browser...')
const context = await chromium.launchPersistentContext(userDataDir, {
  channel: 'chromium',
  headless: false,
  viewport: null,
  args: [
    `--disable-extensions-except=${devBuildPath}`,
    `--load-extension=${devBuildPath}`,
  ],
})

let [serviceWorker] = context.serviceWorkers()
if (!serviceWorker) {
  serviceWorker = await context.waitForEvent('serviceworker')
}
const extensionId = serviceWorker.url().split('/')[2]

// Navigate to the web app
const page = context.pages()[0] ?? (await context.newPage())
await page.goto('https://danmaku.weeblify.app/local')

console.log(`\nExtension loaded: ${extensionId}`)
console.log(`Popup: chrome-extension://${extensionId}/pages/popup.html`)
console.log(`Dashboard: chrome-extension://${extensionId}/pages/dashboard.html`)
console.log('HMR is active — edit source files and changes will reload.')
console.log('Close the browser window to stop.')

// Wait for browser to close, then shut down
context.on('close', async () => {
  console.log('Browser closed. Shutting down dev server...')
  await server.close()
  process.exit(0)
})

// Keep process alive until browser is closed
await new Promise(() => {
  /* intentionally empty */
})

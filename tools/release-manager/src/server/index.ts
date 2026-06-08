import { exec } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { ReleaseManager } from '../core/manager.js'
import { createApp } from './app.js'
import { resolveDataDir } from './dataDir.js'

const HOST = '127.0.0.1'
const DEFAULT_PORT = Number(process.env.DA_RELEASE_MANAGER_PORT ?? 4317)
const WEB_ROOT = fileURLToPath(new URL('../../dist/web/', import.meta.url))

function isFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = createServer()
    tester.once('error', () => resolve(false))
    tester.once('listening', () => {
      tester.close(() => resolve(true))
    })
    tester.listen(port, HOST)
  })
}

async function pickPort(start: number): Promise<number> {
  const end = start + 20
  for (let port = start; port < end; port++) {
    if (await isFree(port)) {
      return port
    }
  }
  throw new Error(`no free port found in range ${start}..${end - 1}`)
}

function openCommand(url: string): string {
  if (process.platform === 'darwin') {
    return `open "${url}"`
  }
  if (process.platform === 'win32') {
    return `start "" "${url}"`
  }
  return `xdg-open "${url}"`
}

function openBrowser(url: string): void {
  exec(openCommand(url), (error) => {
    if (error) {
      console.log(`open ${url} manually`)
    }
  })
}

async function main(): Promise<void> {
  const dataDir = resolveDataDir()
  const manager = new ReleaseManager({ dataDir })
  await manager.reconcile()

  const app = createApp(manager)
  app.use('/*', serveStatic({ root: WEB_ROOT, index: 'index.html' }))

  const port = await pickPort(DEFAULT_PORT)
  const url = `http://${HOST}:${port}`

  serve({ fetch: app.fetch, hostname: HOST, port }, () => {
    console.log(`release-manager listening on ${url}`)
    console.log(`data dir: ${dataDir}`)
    openBrowser(url)
  })
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

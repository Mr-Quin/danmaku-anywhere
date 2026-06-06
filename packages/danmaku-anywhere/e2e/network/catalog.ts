import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import type { Route } from '@playwright/test'
import type { NetworkMock } from '../setup/profile'

const nodeRequire = createRequire(import.meta.url)

// The registry seeds runners from the backend catalog on first boot, so every
// spec needs the built-in three available. Serve the real dango manifests so
// the seeded runners match production behavior.
const CATALOG_IDS = ['dandanplay', 'bilibili', 'tencent'] as const

function manifestFile(id: string): string {
  return `src/manifests/${id}.json`
}

function loadManifest(id: string): unknown {
  const resolved = nodeRequire.resolve(
    `@mr-quin/dango-manifests/manifests/${id}.json`
  )
  return JSON.parse(readFileSync(resolved, 'utf-8'))
}

function buildIndex() {
  return {
    packageVersion: '0.3.0',
    manifests: CATALOG_IDS.map((id) => ({
      id,
      name: id,
      version: '0.3.0',
      apiVersion: 1,
      file: manifestFile(id),
    })),
  }
}

const FILES: Record<string, unknown> = Object.fromEntries(
  CATALOG_IDS.map((id) => [manifestFile(id), loadManifest(id)])
)

export function mockCatalog(): NetworkMock {
  return {
    pattern: /\/manifest(\/file)?(\?|$)/,
    respond: async (route: Route) => {
      const url = new URL(route.request().url())
      if (url.pathname.endsWith('/manifest/file')) {
        const file = url.searchParams.get('file') ?? ''
        const manifest = FILES[file]
        if (!manifest) {
          await route.fulfill({
            status: 404,
            body: `unknown manifest file: ${file}`,
          })
          return
        }
        await route.fulfill({ json: manifest })
        return
      }
      await route.fulfill({ json: buildIndex() })
    },
  }
}

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

function loadManifest(id: string): { apiVersion: number; version: string } {
  const resolved = nodeRequire.resolve(
    `@mr-quin/dango-manifests/manifests/${id}.json`
  )
  return JSON.parse(readFileSync(resolved, 'utf-8'))
}

const MANIFESTS = CATALOG_IDS.map((id) => ({ id, manifest: loadManifest(id) }))

const FILES: Record<string, unknown> = Object.fromEntries(
  MANIFESTS.map(({ id, manifest }) => [manifestFile(id), manifest])
)

// Derive the index from the served files so apiVersion/version can't drift.
const INDEX = {
  manifests: MANIFESTS.map(({ id, manifest }) => ({
    id,
    apiVersion: manifest.apiVersion,
    version: manifest.version,
    file: manifestFile(id),
  })),
}

export function mockCatalog(): NetworkMock {
  return {
    pattern: /\/manifest(\/file)?(\?|$)/,
    respond: async (route: Route) => {
      const url = new URL(route.request().url())
      if (url.pathname.endsWith('/manifest/file')) {
        const file = url.searchParams.get('file') ?? ''
        await route.fulfill({ json: FILES[file] })
        return
      }
      await route.fulfill({ json: INDEX })
    },
  }
}

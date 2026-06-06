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

// Defaults to the built-in three. Pass extra ids to seed catalog-only sources
// (registered but unconfigured) so a spec can exercise the import flow.
export function mockCatalog(ids: readonly string[] = CATALOG_IDS): NetworkMock {
  const manifests = ids.map((id) => ({ id, manifest: loadManifest(id) }))

  const files: Record<string, unknown> = Object.fromEntries(
    manifests.map(({ id, manifest }) => [manifestFile(id), manifest])
  )

  // Derive the index from the served files so apiVersion/version can't drift.
  const index = {
    manifests: manifests.map(({ id, manifest }) => ({
      id,
      apiVersion: manifest.apiVersion,
      version: manifest.version,
      file: manifestFile(id),
    })),
  }

  return {
    pattern: /\/manifest(\/file)?(\?|$)/,
    respond: async (route: Route) => {
      const url = new URL(route.request().url())
      if (url.pathname.endsWith('/manifest/file')) {
        const file = url.searchParams.get('file') ?? ''
        await route.fulfill({ json: files[file] })
        return
      }
      await route.fulfill({ json: index })
    },
  }
}

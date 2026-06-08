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

export function manifestVersion(id: string): string {
  return loadManifest(id).version
}

// Builds a chrome.storage `manifests` record from the real dango manifests,
// optionally pinning some ids to an older version so the catalog advertises a
// newer one (an "update available"). Seed via the profile's rawStorage.
export function manifestStoreSeed(
  versionOverrides: Record<string, string> = {},
  ids: readonly string[] = CATALOG_IDS
): Record<string, { manifest: unknown; kind: 'preinstalled' }> {
  return Object.fromEntries(
    ids.map((id) => {
      const manifest = loadManifest(id)
      const version = versionOverrides[id]
      return [
        id,
        {
          manifest: version ? { ...manifest, version } : manifest,
          kind: 'preinstalled',
        },
      ]
    })
  )
}

// Defaults to the built-in three. Pass extra ids to seed catalog-only sources
// (registered but unconfigured) so a spec can exercise the import flow.
// versionOverrides bumps a manifest's version in both the index and its file,
// so a store seeded at the real version sees an available update.
export function mockCatalog(
  ids: readonly string[] = CATALOG_IDS,
  versionOverrides: Record<string, string> = {}
): NetworkMock {
  const manifests = ids.map((id) => {
    const manifest = loadManifest(id)
    const version = versionOverrides[id]
    return { id, manifest: version ? { ...manifest, version } : manifest }
  })

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

export interface CatalogRequest {
  isFile: boolean
  cacheControl: string
}

// Wraps mockCatalog, recording each request's path kind and Cache-Control so a
// spec can assert the force-refresh path sends no-cache to the backend.
export function recordingCatalog(
  ids: readonly string[],
  versionOverrides: Record<string, string>,
  sink: CatalogRequest[]
): NetworkMock {
  const base = mockCatalog(ids, versionOverrides)
  return {
    pattern: base.pattern,
    respond: async (route: Route) => {
      const headers = await route.request().allHeaders()
      sink.push({
        isFile: new URL(route.request().url()).pathname.endsWith(
          '/manifest/file'
        ),
        cacheControl: headers['cache-control'] ?? '',
      })
      await base.respond(route)
    },
  }
}

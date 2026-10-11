import { SUPPORTED_API_VERSIONS, zManifest } from '@mr-quin/dango'

export interface BundledCatalogEntry {
  id: string
  apiVersion: number
  version: string
  file: string
}

interface BundledEntry extends BundledCatalogEntry {
  raw: unknown
}

// Vite eager glob: the manifest JSON files are inlined at build time, so the
// registry has an offline-usable catalog with no network round trip. The
// pnpm symlink for @mr-quin/dango-manifests resolves through this glob same
// as a real directory.
const rawModules = import.meta.glob(
  '/node_modules/@mr-quin/dango-manifests/src/manifests/*.json',
  { eager: true, import: 'default' }
) as Record<string, unknown>

function manifestFile(id: string): string {
  return `src/manifests/${id}.json`
}

const bundledById = new Map<string, BundledEntry>()

for (const raw of Object.values(rawModules)) {
  const parsed = zManifest.safeParse(raw)
  if (!parsed.success) {
    continue
  }
  const manifest = parsed.data
  if (!SUPPORTED_API_VERSIONS.has(manifest.apiVersion)) {
    continue
  }
  bundledById.set(manifest.id, {
    id: manifest.id,
    apiVersion: manifest.apiVersion,
    version: manifest.version,
    file: manifestFile(manifest.id),
    raw,
  })
}

export function bundledCatalogIndex(): BundledCatalogEntry[] {
  return [...bundledById.values()].map(({ raw: _raw, ...entry }) => entry)
}

export function bundledManifestRaw(id: string): unknown {
  return bundledById.get(id)?.raw
}

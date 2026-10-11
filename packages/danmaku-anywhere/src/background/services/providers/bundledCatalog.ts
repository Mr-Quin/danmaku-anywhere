import { SUPPORTED_API_VERSIONS, zManifest } from '@mr-quin/dango'

export interface BundledCatalogEntry {
  id: string
  apiVersion: number
  version: string
  file: string
}

interface BundledEntry extends BundledCatalogEntry {
  raw: unknown
  identityFields: readonly string[]
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
    identityFields: manifest.identityFields,
  })
}

export function bundledCatalogIndex(): BundledCatalogEntry[] {
  return [...bundledById.values()].map(
    ({ raw: _raw, identityFields: _identityFields, ...entry }) => entry
  )
}

// The identityFields declaration of every bundled manifest, keyed by id. Used
// as a stand-in while the registry has not loaded a manifest yet, so a
// namespace is never derived from a missing declaration.
export function bundledIdentityFieldsMap(): Record<string, readonly string[]> {
  const map: Record<string, readonly string[]> = {}
  for (const [id, entry] of bundledById) {
    map[id] = entry.identityFields
  }
  return map
}

export function bundledManifestRaw(id: string): unknown {
  return bundledById.get(id)?.raw
}

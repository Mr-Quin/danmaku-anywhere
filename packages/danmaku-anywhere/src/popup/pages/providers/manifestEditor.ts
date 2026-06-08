export type JsonParseResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string }

export function parseManifestJson(text: string): JsonParseResult {
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export const STARTER_MANIFEST = `${JSON.stringify(
  {
    apiVersion: 1,
    id: 'user:new-source',
    name: 'New Source',
    version: '1.0.0',
    hosts: ['example.com'],
  },
  null,
  2
)}\n`

export function stringifyManifest(manifest: unknown): string {
  return `${JSON.stringify(manifest, null, 2)}\n`
}

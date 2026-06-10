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

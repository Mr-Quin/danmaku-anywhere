// Extension builds use this module, so they carry neither the standalone
// backend nor the bundled manifests it reads. vite.standalone.config.ts swaps
// in loadStandaloneBackend.standalone.ts.
export async function loadStandaloneBackend(): Promise<
  typeof import('./standaloneBackend')
> {
  throw new Error('Only the standalone build answers background calls')
}

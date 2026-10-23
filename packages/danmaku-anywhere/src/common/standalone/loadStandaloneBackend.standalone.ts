export function loadStandaloneBackend(): Promise<
  typeof import('./standaloneBackend')
> {
  return import('./standaloneBackend')
}

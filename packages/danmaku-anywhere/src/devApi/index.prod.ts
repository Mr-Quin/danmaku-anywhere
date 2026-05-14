// Prod-build stub selected by vite alias when VITE_DA_ENV === 'prod'.
// Inlines its own types instead of importing from ./registry so the dev
// API implementation tree tree-shakes to nothing.

// biome-ignore lint/suspicious/noExplicitAny: stub signature
export function attachDevApi(_container: any, _env: string): never {
  throw new Error('dev tooling unavailable in this build')
}

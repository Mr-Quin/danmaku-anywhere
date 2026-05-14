// Selected via vite alias when VITE_DA_ENV === 'prod'. Inlines its types
// to keep the real registry/namespaces tree-shakable.

// biome-ignore lint/suspicious/noExplicitAny: stub signature
export function attachDevApi(_container: any, _env: string): never {
  throw new Error('dev tooling unavailable in this build')
}

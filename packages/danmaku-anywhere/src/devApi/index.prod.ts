// Prod-build stub. Replaces src/devApi/index.ts via vite alias when
// VITE_DA_ENV='prod', so the entire dev API tree drops out of the bundle.
//
// MUST stay free of identifiers the prod-build DCE guard greps for: keep
// the implementation's unique strings (DevApiError, "Unknown dev API",
// "Read/write provider configs", etc.) out of this file. The function
// signature here intentionally inlines its own `Container` and env types
// rather than importing from registry.ts — importing the real registry
// would defeat the point by dragging it back into the bundle.

// biome-ignore lint/suspicious/noExplicitAny: stub signature
export function attachDevApi(_container: any, _env: string): never {
  throw new Error('dev tooling unavailable in this build')
}

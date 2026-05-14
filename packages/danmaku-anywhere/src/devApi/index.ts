// Dev API entry. Resolves namespace tokens from the IoC container, builds the
// registry, and attaches a Proxy to globalThis.__da. Production builds DCE
// this entire module via the VITE_DA_ENV !== 'prod' import boundary in
// src/background/index.ts (see also the CI grep guard in
// .github/workflows/quality-e2e.yml).

import type { Container } from 'inversify'
import { ExtensionOptionsNamespace } from './namespaces/ExtensionOptionsNamespace'
import { ProviderConfigNamespace } from './namespaces/ProviderConfigNamespace'
import { RuntimeNamespace } from './namespaces/RuntimeNamespace'
import { StorageNamespace } from './namespaces/StorageNamespace'
import { buildRegistry, type DaEnv, type Registry } from './registry'

// Adding a namespace = new file under namespaces/ + one entry in this array.
const NAMESPACE_TOKENS = [
  ProviderConfigNamespace,
  StorageNamespace,
  ExtensionOptionsNamespace,
  RuntimeNamespace,
] as const

declare global {
  // biome-ignore lint/correctness/noUnusedVariables: ambient global
  // biome-ignore lint/style/useConst: var required for ambient declaration
  var __da: unknown | undefined
}

export function attachDevApi(container: Container, env: DaEnv): Registry {
  // Defense-in-depth runtime check. Prod builds shouldn't even reach here
  // (DCE strips the dynamic import in background/index.ts), but if they do,
  // refuse to attach.
  if (env === 'prod') {
    throw new Error('attachDevApi must not be called in prod env')
  }
  const namespaces = NAMESPACE_TOKENS.map((Token) => container.get(Token))
  const registry = buildRegistry(namespaces, { env })
  globalThis.__da = registry.proxy
  return registry
}

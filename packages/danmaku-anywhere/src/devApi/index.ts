import type { Container } from 'inversify'
import {
  type ExtensionOptionsApi,
  ExtensionOptionsNamespace,
} from './namespaces/ExtensionOptionsNamespace'
import {
  type ProviderConfigApi,
  ProviderConfigNamespace,
} from './namespaces/ProviderConfigNamespace'
import {
  type RuntimeApi,
  RuntimeNamespace,
} from './namespaces/RuntimeNamespace'
import {
  type StorageApi,
  StorageNamespace,
} from './namespaces/StorageNamespace'
import {
  buildRegistry,
  type DaEnv,
  type NamespaceDescription,
  type Registry,
} from './registry'

// Adding a namespace = new file under namespaces/ + token in this array +
// matching field on DaApi.
const NAMESPACE_TOKENS = [
  ProviderConfigNamespace,
  StorageNamespace,
  ExtensionOptionsNamespace,
  RuntimeNamespace,
] as const

export interface DaApi {
  describe(): NamespaceDescription[]
  help(): NamespaceDescription[]
  providerConfig: ProviderConfigApi
  storage: StorageApi
  extensionOptions: ExtensionOptionsApi
  runtime: RuntimeApi
}

// Typed as DaApi (not DaApi | undefined). In prod builds the alias swap
// removes this module entirely; everywhere else, attachDevApi has run by
// the time a caller reads __da.
declare global {
  // biome-ignore lint/correctness/noUnusedVariables: ambient global
  // biome-ignore lint/style/useConst: var required for ambient declaration
  var __da: DaApi
}

export function attachDevApi(container: Container, env: DaEnv): Registry {
  // Defense in depth — primary gate is the !IS_DA_PROD check at the call site.
  if (env === 'prod') {
    throw new Error('attachDevApi must not be called in prod env')
  }
  const namespaces = NAMESPACE_TOKENS.map((Token) => container.get(Token))
  const registry = buildRegistry(namespaces, { env })
  globalThis.__da = registry.proxy as DaApi
  return registry
}

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

declare global {
  // biome-ignore lint/correctness/noUnusedVariables: ambient global
  // biome-ignore lint/style/useConst: var required for ambient declaration
  var __da: DaApi
}

export function attachDevApi(container: Container, env: DaEnv): Registry {
  if (env === 'prod') {
    throw new Error('attachDevApi must not be called in prod env')
  }
  const namespaces = NAMESPACE_TOKENS.map((Token) => container.get(Token))
  const registry = buildRegistry(namespaces, { env })
  globalThis.__da = registry.proxy as DaApi
  return registry
}

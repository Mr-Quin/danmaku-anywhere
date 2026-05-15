import type { Container } from 'inversify'
import {
  type BookmarkApi,
  BookmarkNamespace,
} from './namespaces/BookmarkNamespace'
import {
  type EpisodeApi,
  EpisodeNamespace,
} from './namespaces/EpisodeNamespace'
import {
  type ExtensionOptionsApi,
  ExtensionOptionsNamespace,
} from './namespaces/ExtensionOptionsNamespace'
import { type MountApi, MountNamespace } from './namespaces/MountNamespace'
import {
  type ProviderConfigApi,
  ProviderConfigNamespace,
} from './namespaces/ProviderConfigNamespace'
import {
  type RuntimeApi,
  RuntimeNamespace,
} from './namespaces/RuntimeNamespace'
import { type SeasonApi, SeasonNamespace } from './namespaces/SeasonNamespace'
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
  SeasonNamespace,
  EpisodeNamespace,
  BookmarkNamespace,
  MountNamespace,
] as const

export interface DaApi {
  describe(): NamespaceDescription[]
  help(): NamespaceDescription[]
  providerConfig: ProviderConfigApi
  storage: StorageApi
  extensionOptions: ExtensionOptionsApi
  runtime: RuntimeApi
  season: SeasonApi
  episode: EpisodeApi
  bookmark: BookmarkApi
  mount: MountApi
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

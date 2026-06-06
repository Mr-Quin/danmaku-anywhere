import type { ConfigSchema } from '@mr-quin/dango'
import builtinBilibili from '@mr-quin/dango-manifests/manifests/builtin-bilibili.json' with {
  type: 'json',
}
import builtinDandanplay from '@mr-quin/dango-manifests/manifests/builtin-dandanplay.json' with {
  type: 'json',
}
import builtinTencent from '@mr-quin/dango-manifests/manifests/builtin-tencent.json' with {
  type: 'json',
}
import type { ProviderManifestSpec } from '@/common/rpcClient/background/types'

interface BundledManifest {
  id: string
  name: string
  configSchema?: ConfigSchema
  loginProbe?: unknown
  cookieSet?: { url: string; title?: string }
}

const bundledManifests = [
  builtinDandanplay,
  builtinBilibili,
  builtinTencent,
] as unknown as BundledManifest[]

// Mirrors ManifestRegistry's seeded set. Imported only by the standalone
// runtime, so the dango-manifests JSON stays out of the extension build.
export const standaloneManifestSpecs = new Map<string, ProviderManifestSpec>(
  bundledManifests.map((manifest) => [
    manifest.id,
    {
      name: manifest.name,
      hasLoginProbe: manifest.loginProbe !== undefined,
      cookieSet: manifest.cookieSet,
      configSchema: manifest.configSchema,
    },
  ])
)

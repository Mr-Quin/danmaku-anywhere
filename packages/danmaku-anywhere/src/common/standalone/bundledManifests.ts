import { type ConfigSchema, getDisplayStrings, zManifest } from '@mr-quin/dango'
import {
  bundledCatalogIndex,
  bundledManifestRaw,
} from '@/common/providers/bundledCatalog'
import type { ProviderManifestSpec } from '@/common/rpcClient/background/types'

function bundledManifest(id: string) {
  const parsed = zManifest.safeParse(bundledManifestRaw(id))
  return parsed.success ? parsed.data : undefined
}

export function bundledManifestNames(locale?: string): Record<string, string> {
  return Object.fromEntries(
    bundledCatalogIndex().flatMap((entry) => {
      const manifest = bundledManifest(entry.id)
      return manifest
        ? [[manifest.id, getDisplayStrings(manifest, locale).name]]
        : []
    })
  )
}

export function bundledConfigSchema(
  manifestId: string
): { configSchema: ConfigSchema | undefined } | undefined {
  const manifest = bundledManifest(manifestId)
  return manifest && { configSchema: manifest.configSchema }
}

// The same spec ProviderService.getManifestSpec gives, from a bundled manifest
export function bundledManifestSpec(
  manifestId: string,
  locale?: string
): ProviderManifestSpec {
  const manifest = bundledManifest(manifestId)
  if (!manifest) {
    throw new Error(`no manifest registered with id: ${manifestId}`)
  }
  const display = getDisplayStrings(manifest, locale)
  return {
    name: display.name,
    hasLoginProbe: manifest.loginProbe !== undefined,
    cookieSet: manifest.cookieSet
      ? { url: manifest.cookieSet.url, title: display.cookieSet?.title }
      : undefined,
    configSchema: display.configSchema,
  }
}

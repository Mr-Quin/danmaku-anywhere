import { type ConfigSchema, getDisplayStrings, zManifest } from '@mr-quin/dango'
import {
  bundledCatalogIndex,
  bundledManifestRaw,
} from '@/common/providers/bundledCatalog'

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

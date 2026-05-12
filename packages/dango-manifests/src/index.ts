import builtinDandanplay from './manifests/builtin-dandanplay.json' with {
  type: 'json',
}

/**
 * Manifest data, unparsed. Consumers wrap with `zManifest.parse()` from
 * `@danmaku-anywhere/dango` once at startup; the parsed `Manifest` then
 * drives a `ManifestRunner`.
 */
export const BUILTIN_MANIFESTS = {
  'builtin:dandanplay': builtinDandanplay,
} as const

export type BuiltinManifestId = keyof typeof BUILTIN_MANIFESTS

export { builtinDandanplay }

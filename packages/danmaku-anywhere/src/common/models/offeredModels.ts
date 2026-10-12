import { BASELINE_MANIFEST, DEFAULT_MODEL_ID } from './baseline'
import type { ModelEntry } from './schema'

export function offeredModels(
  models: ModelEntry[],
  debug: boolean
): ModelEntry[] {
  if (debug) {
    return models
  }
  return models.filter((model) => model.delivery === 'bundled')
}

// A saved id can name a model that is no longer offered, for example one
// restored from a backup made with the debug option on.
export function resolveOfferedModel(
  offered: ModelEntry[],
  id: string
): ModelEntry {
  const match =
    offered.find((model) => model.id === id) ??
    offered.find((model) => model.id === DEFAULT_MODEL_ID)
  if (match) {
    return match
  }
  return offered[0] ?? BASELINE_MANIFEST.models[0]
}

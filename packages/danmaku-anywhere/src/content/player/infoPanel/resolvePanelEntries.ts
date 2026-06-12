import type { PanelEntry, PanelSource } from './panelEntry'

// Fixed display order; a new source slots in here.
const SOURCE_ORDER: readonly PanelSource[] = ['pipeline', 'occlusion']

/** The present entries in display order, one row per source. */
export function resolvePanelEntries(
  entries: Partial<Record<PanelSource, PanelEntry>>
): PanelEntry[] {
  const resolved: PanelEntry[] = []
  for (const source of SOURCE_ORDER) {
    const entry = entries[source]
    if (entry) {
      resolved.push(entry)
    }
  }
  return resolved
}

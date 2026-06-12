import type { PanelEntry, PanelSource } from './panelEntry'

// Fixed display order, highest priority first. A second source (occlusion)
// slots in here; severity-based ordering is intentionally out of scope.
const SOURCE_ORDER: readonly PanelSource[] = ['pipeline', 'occlusion']

/**
 * Returns the present entries in display order, so the panel can render one row
 * per source. Absent sources are skipped; an empty store yields an empty list
 * (the panel renders nothing).
 */
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

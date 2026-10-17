import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { seasonActions } from '@/common/providers/seasonActions'
import {
  capabilitiesFromManifest,
  type SourceCapabilityAnswer,
} from '@/common/providers/sourceCapabilities'
import { makeSeason } from '@/tests/factories'
import { SeasonContextMenuPure } from './SeasonContextMenuPure'

/**
 * The season menu offers each source action only when the season's source
 * can do it, and keeps it visible but disabled once the source is deleted.
 */

const pipeline = {}

const withSeasonPipeline: SourceCapabilityAnswer = {
  status: 'available',
  capabilities: capabilitiesFromManifest({
    search: pipeline,
    episodes: pipeline,
    danmaku: pipeline,
    season: pipeline,
  }),
}

const withoutSeasonPipeline: SourceCapabilityAnswer = {
  status: 'available',
  capabilities: capabilitiesFromManifest({
    search: pipeline,
    episodes: pipeline,
    danmaku: pipeline,
  }),
}

const removed: SourceCapabilityAnswer = { status: 'removed' }

let root: Root | undefined

afterEach(() => {
  root?.unmount()
  root = undefined
})

async function renderMenu(source: SourceCapabilityAnswer | undefined) {
  const element = document.createElement('div')
  document.body.append(element)
  root = createRoot(element)
  root.render(
    <SeasonContextMenuPure
      season={makeSeason()}
      actions={seasonActions(source)}
      bookmarked={false}
      onExport={vi.fn()}
      onExportBackup={vi.fn()}
      onDelete={vi.fn()}
      onRefresh={vi.fn()}
      isRefreshing={false}
      isExporting={false}
      onBookmarkToggle={vi.fn()}
      onBookmarkRefresh={vi.fn()}
      isBookmarkLoading={false}
      contextMenuPosition={{ top: 0, left: 0 }}
      onClose={vi.fn()}
    />
  )
  await vi.waitFor(() => {
    expect(menuItem('delete')).not.toBeNull()
  })
}

function menuItem(id: string): HTMLElement | null {
  return document.querySelector(`[data-testid="drilldown-menu-item-${id}"]`)
}

describe('SeasonContextMenuPure', () => {
  it('offers Refresh Metadata for a source with a season pipeline', async () => {
    await renderMenu(withSeasonPipeline)

    expect(menuItem('refresh')).not.toBeNull()
    expect(menuItem('refresh')?.getAttribute('aria-disabled')).not.toBe('true')
  })

  it('hides Refresh Metadata for a source without a season pipeline', async () => {
    await renderMenu(withoutSeasonPipeline)

    expect(menuItem('refresh')).toBeNull()
    expect(menuItem('bookmarkAdd')).not.toBeNull()
  })

  it('keeps source actions visible but disabled once the source is deleted', async () => {
    await renderMenu(removed)

    expect(menuItem('refresh')?.getAttribute('aria-disabled')).toBe('true')
    expect(menuItem('bookmarkAdd')?.getAttribute('aria-disabled')).toBe('true')
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from '@/popup/store'
import { SeasonDetailsPage } from './SeasonDetailsPage'

/**
 * Each episode row owns its own hooks, so the list can change length, from a
 * refetch or the filter box, without React seeing a different number of hooks
 * in the page. Renders the page with a fake episode query and asserts the rows
 * shown after the list shrinks and grows.
 */

const episodes = vi.hoisted(() => ({ current: [] as unknown[] }))

vi.mock('@/common/danmaku/queries/useSearchEpisode', () => ({
  useSearchEpisode: () => ({ data: episodes.current }),
}))

vi.mock('@/common/bookmark/components/BookmarkToggleButton', () => ({
  BookmarkToggleButton: () => null,
}))

vi.mock('@/common/rpcClient/background/client', () => ({
  chromeRpcClient: {
    episodeFilterLite: () => Promise.resolve({ data: [] }),
  },
}))

function episode(title: string) {
  return {
    indexedId: title,
    title,
    providerIds: {},
    provider: 'DanDanPlay',
    season: { id: 1, title: 'Show' },
  }
}

const season = {
  id: 1,
  title: 'Show',
  providerConfigId: 'dandanplay',
  manifestId: 'dandanplay',
}

let root: Root | undefined
let container: HTMLElement

function render() {
  act(() => {
    root?.render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <SeasonDetailsPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
  })
}

function rowTitles() {
  return [
    ...container.querySelectorAll('[data-testid^="episode-list-item-"]'),
  ].map((row) => row.textContent ?? '')
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  useStore.getState().search.setSeason(season as never)
  useStore.getState().search.setProvider({ id: 'dandanplay' } as never)
  container = document.createElement('div')
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = undefined
  vi.unstubAllGlobals()
})

describe('SeasonDetailsPage', () => {
  it('keeps rendering when a refetch changes how many episodes there are', () => {
    episodes.current = [episode('Episode 1'), episode('Episode 2')]
    render()
    expect(rowTitles()).toHaveLength(2)

    episodes.current = [1, 2, 3, 4].map((n) => episode(`Episode ${n}`))
    render()
    expect(rowTitles()).toHaveLength(4)

    episodes.current = [episode('Episode 1')]
    render()
    expect(rowTitles()).toHaveLength(1)
  })
})

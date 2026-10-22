import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import { usePopup } from '@/content/controller/store/popupStore'
import { useStore } from '@/content/controller/store/store'
import { SearchPage } from './SearchPage'

/**
 * The in-page search follows the show on the page: when a different show
 * comes on, a season opened for the previous one closes and the search starts
 * over with the new title. Renders the page with the search form and season
 * details replaced by stand-ins, and asserts which one is shown and the term
 * the search starts with.
 */

const seen = vi.hoisted(() => ({ committedTerms: [] as string[] }))

vi.mock('@/common/components/SearchPageCore/SearchPageCore', async () => {
  const { useState } = await import('react')
  return {
    SearchPageCore: (props: {
      searchTerm: string
      onSeasonClick: (season: unknown, provider: unknown) => void
    }) => {
      const [committed] = useState(() => {
        seen.committedTerms.push(props.searchTerm)
        return props.searchTerm
      })
      return (
        <button
          type="button"
          data-testid="search-form"
          data-committed={committed}
          onClick={() => {
            props.onSeasonClick({ id: 1, title: 'A season' }, { id: 'ddp' })
          }}
        />
      )
    },
  }
})

vi.mock(
  '@/content/controller/ui/floatingPanel/pages/search/SeasonDetailsPage',
  () => ({
    SeasonDetailsPage: () => <div data-testid="season-details" />,
  })
)

vi.mock('@/common/options/providerConfig/useProviderConfig', () => ({
  useProviderConfig: () => ({ enabledProviders: [{ id: 'ddp' }] }),
}))

vi.mock('@/content/controller/common/hooks/useLoadDanmaku', () => ({
  useLoadDanmaku: () => ({ mountChosen: vi.fn() }),
}))

vi.mock('@/common/seasonMap/queries/useAllSeasonMap', () => ({
  useAllSeasonMap: () => ({ data: [] }),
}))

vi.mock('@/common/anime/queries/useUpsertSeason', () => ({
  useUpsertSeason: () => ({
    mutate: (
      season: unknown,
      { onSuccess }: { onSuccess: (persisted: unknown) => void }
    ) => {
      onSuccess(season)
    },
  }),
}))

vi.mock('./AddSeasonMapDialog', () => ({
  useShowAddSeasonMapDialog: () => {
    return ({
      season,
      onProceed,
    }: {
      season: unknown
      onProceed: (s: unknown) => void
    }) => {
      onProceed(season)
    }
  },
}))

let root: Root | undefined
let container: HTMLElement

function showOnPage(title: string, episode = 1) {
  act(() => {
    useStore
      .getState()
      .integration.setMediaInfo(new MediaInfo({ title, episode }))
    usePopup.getState().setSearchTitle(title)
  })
}

function byTestId(id: string) {
  return container.querySelector<HTMLElement>(`[data-testid="${id}"]`)
}

const initialStore = useStore.getState()
const initialPopup = usePopup.getState()

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  useStore.setState(initialStore, true)
  usePopup.setState(initialPopup, true)
  seen.committedTerms = []
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

describe('SearchPage', () => {
  it('starts over when a different show comes on', () => {
    showOnPage('Show A')
    act(() => {
      root?.render(<SearchPage />)
    })
    act(() => {
      byTestId('search-form')?.click()
    })
    expect(byTestId('season-details')).not.toBeNull()

    showOnPage('Show B')

    expect(byTestId('season-details')).toBeNull()
    expect(byTestId('search-form')?.dataset.committed).toBe('Show B')
  })

  it('keeps an opened season for another episode of the same show', () => {
    showOnPage('Show A')
    act(() => {
      root?.render(<SearchPage />)
    })
    act(() => {
      byTestId('search-form')?.click()
    })

    showOnPage('Show A', 2)

    expect(byTestId('season-details')).not.toBeNull()
  })
})

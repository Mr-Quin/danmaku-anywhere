import { useNavigate } from 'react-router'
import { useUpsertSeason } from '@/common/anime/queries/useUpsertSeason'
import { isPersistedSeason } from '@/common/anime/utils'
import { SearchPageCore } from '@/common/components/SearchPageCore/SearchPageCore'
import { useStoreScrollPosition } from '@/common/hooks/useStoreScrollPosition'
import { useStore } from '@/popup/store'

export const SearchPage = () => {
  const navigate = useNavigate()

  const search = useStore.use.search()
  const upsertSeason = useUpsertSeason()

  const layoutRef = useStoreScrollPosition<HTMLDivElement>('searchPage')

  return (
    <SearchPageCore
      ref={layoutRef}
      searchTerm={search.keyword}
      onSearchTermChange={search.setKeyword}
      onSeasonClick={async (season, provider) => {
        // Search results are not persisted; the user picking one is the signal
        // to commit it to the seasons table so downstream APIs (bookmark,
        // episode-list lookup, season map) have a real seasonId.
        let persisted
        if (isPersistedSeason(season)) {
          persisted = season
        } else {
          try {
            persisted = await upsertSeason.mutateAsync(season)
          } catch {
            // useUpsertSeason surfaces the error via toast; stop here so we
            // don't navigate to a detail page with an unpersisted season.
            return
          }
        }
        search.setSeason(persisted)
        search.setProvider(provider)
        navigate('season')
      }}
    />
  )
}

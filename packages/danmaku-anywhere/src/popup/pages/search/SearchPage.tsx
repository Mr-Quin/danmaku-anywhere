import { useNavigate } from 'react-router'
import { useUpsertSeason } from '@/common/anime/queries/useUpsertSeason'
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
      providerId={search.providerId}
      onProviderIdChange={search.setProviderId}
      onSeasonClick={(season, provider) => {
        upsertSeason.mutate(season, {
          onSuccess: (persisted) => {
            search.setSeason(persisted)
            search.setProvider(provider)
            navigate('season')
          },
        })
      }}
    />
  )
}

import { useNavigate } from 'react-router'
import { SearchPageCore } from '@/common/components/SearchPageCore/SearchPageCore'
import { useStoreScrollPosition } from '@/common/hooks/useStoreScrollPosition'
import { useStore } from '@/popup/store'

export const SearchPage = () => {
  const navigate = useNavigate()

  const search = useStore.use.search()

  const layoutRef = useStoreScrollPosition<HTMLDivElement>('searchPage')

  return (
    <SearchPageCore
      ref={layoutRef}
      searchTerm={search.keyword}
      onSearchTermChange={search.setKeyword}
      onSeasonClick={(season, provider) => {
        search.setSeason(season)
        search.setProvider(provider)
        navigate('season')
      }}
    />
  )
}

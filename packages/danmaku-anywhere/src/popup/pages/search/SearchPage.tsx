import { useNavigate } from 'react-router'
import { SearchPageCore } from '@/common/components/SearchPageCore/SearchPageCore'
import { useStoreScrollPosition } from '@/common/hooks/useStoreScrollPosition'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { useStore } from '@/popup/store'

export const SearchPage = () => {
  const navigate = useNavigate()

  const search = useStore.use.search()

  const { mountDanmaku } = useLoadDanmaku()

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
      onImportSuccess={(episode) => mountDanmaku([episode])}
    />
  )
}

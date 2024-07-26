import { FilterButton } from '@/common/components/FilterButton'
import { useStore } from '@/popup/store'

export const AnimeFilter = () => {
  const setFilter = useStore.use.danmaku().setAnimeFilter
  const filter = useStore.use.danmaku().animeFilter

  return <FilterButton filter={filter} onChange={setFilter} />
}

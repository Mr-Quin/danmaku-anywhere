import {
  DanmakuSelector,
  type SelectableEpisode,
} from '@/common/components/DanmakuSelector/DanmakuSelector'
import { FilterButton } from '@/common/components/FilterButton'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { TypeSelector } from '@/common/components/TypeSelector'
import { TabToolbar } from '@/content/common/TabToolbar'
import { HasDanmaku } from '@/popup/pages/mount/components/HasDanmaku'
import { useStore } from '@/popup/store'
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'

type SelectDanmakuProps = {
  onSelect: (episode: SelectableEpisode) => void
}

export const SelectDanmaku = ({ onSelect }: SelectDanmakuProps) => {
  const { t } = useTranslation()

  const { selectedTypes, animeFilter, setSelectedType, setAnimeFilter } =
    useStore.use.danmaku()

  return (
    <>
      <TabToolbar title={t('mountPage.pageTitle')}>
        <FilterButton onChange={setAnimeFilter} filter={animeFilter} />
        <TypeSelector
          selectedTypes={selectedTypes}
          setSelectedType={setSelectedType}
        />
      </TabToolbar>
      <Suspense fallback={<FullPageSpinner />}>
        <HasDanmaku>
          <DanmakuSelector
            filter={animeFilter}
            typeFilter={selectedTypes}
            onSelect={onSelect}
          />
        </HasDanmaku>
      </Suspense>
    </>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DrilldownMenu } from '../../component/DrilldownMenu'

import { AnimeList } from './AnimeList'
import { AnimeFilter } from './components/AnimeFilter'
import { ExportButton } from './components/ExportButton'

import { TabToolbar } from '@/popup/component/TabToolbar'
import { TabLayout } from '@/popup/layout/TabLayout'

export const AnimePage = () => {
  const [ref, setRef] = useState<HTMLDivElement>()
  const { t } = useTranslation()

  return (
    <TabLayout ref={setRef}>
      <TabToolbar title={t('danmakuPage.animeList')}>
        <AnimeFilter />
        <DrilldownMenu ButtonProps={{ edge: 'end' }}>
          <ExportButton />
        </DrilldownMenu>
      </TabToolbar>
      <AnimeList scrollElement={ref as HTMLDivElement} />
    </TabLayout>
  )
}

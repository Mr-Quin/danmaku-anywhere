import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DrilldownMenu } from '../../component/DrilldownMenu'

import { AnimeList } from './AnimeList'
import { AnimeFilter } from './components/AnimeFilter'
import { ExportDanmaku } from './components/ExportDanmaku'
import { TypeSelector } from './components/TypeSelector'
import { UploadDanmaku } from './components/UploadDanmaku'

import { TabToolbar } from '@/popup/component/TabToolbar'
import { TabLayout } from '@/popup/layout/TabLayout'

export const AnimePage = () => {
  const [ref, setRef] = useState<HTMLDivElement>()
  const { t } = useTranslation()

  return (
    <TabLayout ref={setRef}>
      <TabToolbar title={t('danmakuPage.animeList')}>
        <AnimeFilter />
        <TypeSelector />
        <DrilldownMenu ButtonProps={{ edge: 'end' }}>
          <UploadDanmaku />
          <ExportDanmaku />
        </DrilldownMenu>
      </TabToolbar>
      <AnimeList scrollElement={ref as HTMLDivElement} />
    </TabLayout>
  )
}

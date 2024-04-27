import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DrilldownMenu } from '../../component/DrilldownMenu'

import { AnimeList } from './AnimeList'
import { AnimeFilter } from './components/AnimeFilter'
import { ExportDanmaku } from './components/ExportDanmaku'
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
        <DrilldownMenu ButtonProps={{ edge: 'end' }}>
          <ExportDanmaku />
          <UploadDanmaku />
        </DrilldownMenu>
      </TabToolbar>
      <AnimeList scrollElement={ref as HTMLDivElement} />
    </TabLayout>
  )
}

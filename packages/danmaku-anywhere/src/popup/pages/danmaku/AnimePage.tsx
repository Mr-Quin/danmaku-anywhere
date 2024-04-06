import { useState } from 'react'

import { DanmakuList } from './AnimeList'
import { AnimeFilter } from './components/AnimeFilter'
import { DrilldownMenu } from './components/DrilldownMenu'
import { ExportButton } from './components/ExportButton'

import { TabToolbar } from '@/popup/component/TabToolbar'
import { TabLayout } from '@/popup/layout/TabLayout'

export const AnimePage = () => {
  const [ref, setRef] = useState<HTMLDivElement>()

  return (
    <TabLayout ref={setRef}>
      <TabToolbar title="Anime List">
        <AnimeFilter />
        <DrilldownMenu ButtonProps={{ edge: 'end' }}>
          <ExportButton />
        </DrilldownMenu>
      </TabToolbar>
      <DanmakuList scrollElement={ref as HTMLDivElement} />
    </TabLayout>
  )
}

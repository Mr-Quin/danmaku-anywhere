import { useState } from 'react'

import { DanmakuList } from './DanmakuList'
import { ExportButton } from './ExportButton'

import { TabToolbar } from '@/popup/component/TabToolbar'
import { TabLayout } from '@/popup/layout/TabLayout'

export const DanmakuPage = () => {
  const [ref, setRef] = useState<HTMLDivElement>()

  return (
    <TabLayout ref={setRef}>
      <TabToolbar title="Danmaku List">
        <ExportButton />
      </TabToolbar>
      <DanmakuList scrollElement={ref as HTMLDivElement} />
    </TabLayout>
  )
}

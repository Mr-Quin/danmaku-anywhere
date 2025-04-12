import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AnimeFilter } from '../components/AnimeFilter'
import { AnimeList } from '../components/AnimeList'
import { ExportAllDanmakuButton } from '../components/ExportAllDanmakuButton'
import { TypeSelector } from '../components/TypeSelector'
import { UploadDanmaku } from '../components/UploadDanmaku'

import { DrilldownMenu } from '@/content/common/DrilldownMenu'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { ConfirmDeleteDialog } from '@/popup/pages/danmaku/components/ConfirmDeleteDialog'
import { DeleteAllDanmakuButton } from '@/popup/pages/danmaku/components/DeleteAllDanmakuButton'

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
          <ExportAllDanmakuButton />
          <DeleteAllDanmakuButton />
        </DrilldownMenu>
      </TabToolbar>
      <AnimeList scrollElement={ref as HTMLDivElement} />
      <ConfirmDeleteDialog />
    </TabLayout>
  )
}

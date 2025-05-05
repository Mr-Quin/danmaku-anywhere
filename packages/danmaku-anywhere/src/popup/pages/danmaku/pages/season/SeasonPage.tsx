import { useTranslation } from 'react-i18next'

import { ExportAllDanmakuButton } from '../../components/ExportAllDanmakuButton'
import { UploadDanmaku } from '../../components/UploadDanmaku'
import { SeasonFilter } from './SeasonFilter'
import { SeasonList } from './SeasonList'
import { TypeSelector } from './TypeSelector'

import { DrilldownMenu } from '@/content/common/DrilldownMenu'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { ConfirmDeleteDialog } from '@/popup/pages/danmaku/components/ConfirmDeleteDialog'
import { DeleteAllDanmakuButton } from '@/popup/pages/danmaku/components/DeleteAllDanmakuButton'

export const SeasonPage = () => {
  const { t } = useTranslation()

  return (
    <TabLayout>
      <TabToolbar title={t('danmakuPage.animeList')}>
        <SeasonFilter />
        <TypeSelector />
        <DrilldownMenu ButtonProps={{ edge: 'end' }}>
          <UploadDanmaku />
          <ExportAllDanmakuButton />
          <DeleteAllDanmakuButton />
        </DrilldownMenu>
      </TabToolbar>
      <SeasonList />
      <ConfirmDeleteDialog />
    </TabLayout>
  )
}

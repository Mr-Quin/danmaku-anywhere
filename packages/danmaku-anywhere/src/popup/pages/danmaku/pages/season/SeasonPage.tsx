import { Keyboard } from '@mui/icons-material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CaptureKeypress } from '@/common/components/CaptureKeypress'
import { FilterButton } from '@/common/components/FilterButton'
import { usePlatformInfo } from '@/common/hooks/usePlatformInfo'
import { DrilldownMenu } from '@/content/common/DrilldownMenu'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { ConfirmDeleteDialog } from '@/popup/pages/danmaku/components/ConfirmDeleteDialog'
import { useStore } from '@/popup/store'
import { TypeSelector } from '../../../../../common/components/TypeSelector'
import { ExportAllDanmakuButton } from '../../components/ExportAllDanmakuButton'
import { SeasonList } from './SeasonList'

export const SeasonPage = () => {
  const { t } = useTranslation()

  const { setAnimeFilter, animeFilter, selectedTypes, setSelectedType } =
    useStore.use.danmaku()

  const { isMobile } = usePlatformInfo()

  const [isFilterOpen, setIsFilterOpen] = useState(false)

  return (
    <TabLayout>
      <CaptureKeypress
        onChange={setAnimeFilter}
        value={animeFilter}
        disabled={isFilterOpen}
        autoFocus
        boxProps={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {({ focused, disabled }) => {
          return (
            <>
              <TabToolbar title={t('danmakuPage.animeList')}>
                {!isMobile && (
                  <Keyboard
                    color={disabled || !focused ? 'disabled' : 'action'}
                  />
                )}
                <FilterButton
                  filter={animeFilter}
                  onChange={setAnimeFilter}
                  open={isFilterOpen}
                  onOpen={() => setIsFilterOpen(true)}
                  onClose={() => setIsFilterOpen(false)}
                />
                <TypeSelector
                  selectedTypes={selectedTypes}
                  setSelectedType={setSelectedType}
                />
                <DrilldownMenu ButtonProps={{ edge: 'end' }}>
                  <ExportAllDanmakuButton />
                </DrilldownMenu>
              </TabToolbar>
              <SeasonList />
            </>
          )
        }}
      </CaptureKeypress>
      <ConfirmDeleteDialog />
    </TabLayout>
  )
}

import { Button } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CaptureKeypress } from '@/common/components/CaptureKeypress'
import { DanmakuSelector } from '@/common/components/DanmakuSelector/DanmakuSelector'
import { FilterButton } from '@/common/components/FilterButton'
import { TypeSelector } from '@/common/components/TypeSelector'
import { usePlatformInfo } from '@/common/hooks/usePlatformInfo'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { useUnmountDanmaku } from '@/content/controller/common/hooks/useUnmountDanmaku'
import { usePopup } from '@/content/controller/store/popupStore'
import { useStore } from '@/content/controller/store/store'
import { useMountDanmakuContent } from '@/content/controller/ui/floatingPanel/pages/mount/useMountDanmakuContent'
import type {
  CustomEpisodeLite,
  EpisodeLite,
} from '@danmaku-anywhere/danmaku-converter'
import { Keyboard } from '@mui/icons-material'

export const MountPage = () => {
  const { t } = useTranslation()

  const { isMounted, danmakuLite, filter, setFilter } = useStore.use.danmaku()
  const selectedProviders = usePopup.use.selectedProviders()
  const setSelectedProviders = usePopup.use.setSelectedProviders()

  const { isMobile } = usePlatformInfo()

  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const { mutate, isPending } = useMountDanmakuContent()
  const unmountMutation = useUnmountDanmaku()

  const handleSelectDanmaku = (
    danmakuLite: EpisodeLite | CustomEpisodeLite
  ) => {
    mutate(danmakuLite)
  }

  const handleUnmount = () => {
    unmountMutation.mutate(undefined)
  }

  return (
    <TabLayout>
      <CaptureKeypress
        onChange={setFilter}
        value={filter}
        disabled={isFilterOpen || isMobile}
        autoFocus
        boxProps={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {({ focused }) => {
          return (
            <>
              <TabToolbar title={t('mountPage.pageTitle')}>
                {!isMobile && (
                  <Keyboard
                    color={!focused || isFilterOpen ? 'disabled' : 'inherit'}
                  />
                )}
                <FilterButton
                  filter={filter}
                  onChange={setFilter}
                  open={isFilterOpen}
                  onOpen={() => setIsFilterOpen(true)}
                  onClose={() => setIsFilterOpen(false)}
                />
                <TypeSelector
                  selectedTypes={selectedProviders}
                  setSelectedType={setSelectedProviders}
                />
                <Button
                  variant="outlined"
                  type="button"
                  onClick={handleUnmount}
                  color="warning"
                  disabled={!danmakuLite || !isMounted}
                >
                  {t('danmaku.unmount')}
                </Button>
              </TabToolbar>
              <DanmakuSelector
                filter={filter}
                typeFilter={selectedProviders}
                onSelect={handleSelectDanmaku}
                disabled={isPending}
              />
            </>
          )
        }}
      </CaptureKeypress>
    </TabLayout>
  )
}

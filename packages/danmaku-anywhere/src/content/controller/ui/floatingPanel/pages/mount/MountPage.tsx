import type { GenericEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import { ChecklistRtl, Keyboard } from '@mui/icons-material'
import { Button, Collapse, IconButton, Tooltip } from '@mui/material'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CaptureKeypress } from '@/common/components/CaptureKeypress'
import {
  DanmakuSelector,
  type DanmakuSelectorApi,
} from '@/common/components/DanmakuSelector/DanmakuSelector'
import { FilterButton } from '@/common/components/FilterButton'
import { TypeSelector } from '@/common/components/TypeSelector'
import { usePlatformInfo } from '@/common/hooks/usePlatformInfo'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { usePopup } from '@/content/controller/store/popupStore'
import { useStore } from '@/content/controller/store/store'
import { useMountDanmakuContent } from '@/content/controller/ui/floatingPanel/pages/mount/useMountDanmakuContent'

export const MountPage = () => {
  const { t } = useTranslation()

  const { filter, setFilter } = useStore.use.danmaku()
  const selectedProviders = usePopup.use.selectedProviders()
  const setSelectedProviders = usePopup.use.setSelectedProviders()

  const { isMobile } = usePlatformInfo()

  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [multiselect, setMultiselect] = useState(false)
  const selectorRef = useRef<DanmakuSelectorApi>(null)

  const { mutate, isPending } = useMountDanmakuContent()

  const handleSelectDanmaku = (episodesLite: GenericEpisodeLite) => {
    mutate([episodesLite])
  }

  const handleMountSelected = async () => {
    if (!selectorRef.current) return

    const selectedEpisodes = selectorRef.current.getSelectedEpisodes()
    if (selectedEpisodes.length === 0) return

    mutate(selectedEpisodes)

    // Clear selection after mounting
    selectorRef.current.clearSelection()
    setMultiselect(false)
  }

  const toggleMultiselect = () => {
    setMultiselect(!multiselect)
    if (selectorRef.current) {
      selectorRef.current.clearSelection()
    }
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
                <Tooltip title={t('common.multiselect')}>
                  <IconButton
                    onClick={toggleMultiselect}
                    color={multiselect ? 'primary' : 'default'}
                  >
                    <ChecklistRtl />
                  </IconButton>
                </Tooltip>
                <Collapse in={multiselect} orientation="horizontal">
                  <Button
                    variant="contained"
                    type="button"
                    onClick={handleMountSelected}
                    color="primary"
                    disabled={!multiselect || isPending}
                    sx={{
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t('danmaku.mount')}
                  </Button>
                </Collapse>
              </TabToolbar>
              <DanmakuSelector
                ref={selectorRef}
                filter={filter}
                typeFilter={selectedProviders}
                onSelect={handleSelectDanmaku}
                disabled={isPending}
                multiselect={multiselect}
              />
            </>
          )
        }}
      </CaptureKeypress>
    </TabLayout>
  )
}

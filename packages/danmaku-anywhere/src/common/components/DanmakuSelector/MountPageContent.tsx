import type {
  DanmakuSourceType,
  GenericEpisodeLite,
} from '@danmaku-anywhere/danmaku-converter'
import { ChecklistRtl, Keyboard } from '@mui/icons-material'
import { Alert, Box, Button, IconButton, Tooltip } from '@mui/material'
import type { ReactElement, ReactNode } from 'react'
import { Fragment, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CaptureKeypress } from '@/common/components/CaptureKeypress'
import {
  DanmakuTree,
  type DanmakuTreeApi,
} from '@/common/components/DanmakuSelector/DanmakuTree'
import { DanmakuViewer } from '@/common/components/DanmakuSelector/DanmakuViewer'
import { MountPageBottomBar } from '@/common/components/DanmakuSelector/MountPageBottomBar'
import { FilterButton } from '@/common/components/FilterButton'
import { TypeSelector } from '@/common/components/TypeSelector'
import { useDeleteEpisode } from '@/common/danmaku/queries/useDeleteEpisode'
import { usePlatformInfo } from '@/common/hooks/usePlatformInfo'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { useExportXml } from '@/popup/hooks/useExportXml'

export interface MountPageContentProps {
  filter: string
  onFilterChange: (filter: string) => void
  selectedTypes: string[]
  onSelectedTypesChange: (types: DanmakuSourceType[]) => void
  multiselect: boolean
  onToggleMultiselect: () => void
  onMount: (episodes: GenericEpisodeLite[]) => void
  isMounting: boolean

  onUnmount?: () => void
  isMounted?: boolean
  isConnected?: boolean
  selectorWrapper?: React.ComponentType<{ children: ReactNode }>
}

export const MountPageContent = ({
  filter,
  onFilterChange,
  selectedTypes,
  onSelectedTypesChange,
  multiselect,
  onToggleMultiselect,
  onMount,
  isMounting,
  onUnmount,
  isMounted = false,
  isConnected = true,
  selectorWrapper: Wrapper = Fragment,
}: MountPageContentProps): ReactElement => {
  const { t } = useTranslation()
  const { isMobile } = usePlatformInfo()

  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [viewingEpisode, setViewingEpisode] =
    useState<GenericEpisodeLite | null>(null)
  const [selectionCount, setSelectionCount] = useState(0)

  const danmakuTreeRef = useRef<DanmakuTreeApi>(null)

  const exportXmlMutation = useExportXml()
  const deleteEpisodeMutation = useDeleteEpisode()

  const handleMountSingle = (episode: GenericEpisodeLite) => {
    onMount([episode])
  }

  const getSelection = () => {
    // biome-ignore lint/style/noNonNullAssertion: guaranteed to be not null
    return danmakuTreeRef.current!.getSelectedEpisodes()
  }

  const handleMountMultiple = () => {
    const { genericEpisodes } = getSelection()
    if (genericEpisodes.length === 0) {
      return
    }

    onMount(genericEpisodes)
    danmakuTreeRef.current?.clearSelection()
    onToggleMultiselect()
  }

  const handleExport = () => {
    const { episodes, customEpisodes } = getSelection()
    if (episodes.length === 0) {
      return
    }
    exportXmlMutation.mutate({
      filter: { ids: episodes.map((ep) => ep.id) },
      customFilter: { ids: customEpisodes.map((ep) => ep.id) },
    })
  }

  const handleDelete = () => {
    const { episodes, customEpisodes } = getSelection()
    deleteEpisodeMutation.mutate({
      isCustom: false,
      filter: { ids: episodes.map((ep) => ep.id) },
    })
    deleteEpisodeMutation.mutate({
      isCustom: true,
      filter: { ids: customEpisodes.map((ep) => ep.id) },
    })
  }

  const handleToggleMultiselect = () => {
    danmakuTreeRef.current?.clearSelection()
    onToggleMultiselect()
  }

  if (viewingEpisode) {
    return (
      <TabLayout>
        <DanmakuViewer
          episode={viewingEpisode}
          onClose={() => setViewingEpisode(null)}
        />
      </TabLayout>
    )
  }

  return (
    <TabLayout overflow="hidden">
      <CaptureKeypress
        onChange={onFilterChange}
        value={filter}
        disabled={isFilterOpen || isMobile}
        autoFocus
        boxProps={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {({ focused, disabled }) => (
          <>
            <TabToolbar title={t('mountPage.pageTitle')}>
              {!isMobile && (
                <Keyboard
                  color={disabled || !focused ? 'disabled' : 'action'}
                />
              )}
              <FilterButton
                filter={filter}
                onChange={onFilterChange}
                open={isFilterOpen}
                onOpen={() => setIsFilterOpen(true)}
                onClose={() => setIsFilterOpen(false)}
              />
              <TypeSelector
                selectedTypes={selectedTypes as DanmakuSourceType[]}
                setSelectedType={(types) => onSelectedTypesChange(types)}
              />
              <Tooltip title={t('common.multiselect')}>
                <div>
                  <IconButton
                    onClick={handleToggleMultiselect}
                    color={multiselect ? 'primary' : 'default'}
                  >
                    <ChecklistRtl />
                  </IconButton>
                </div>
              </Tooltip>

              {onUnmount && !multiselect && (
                <Button
                  variant="outlined"
                  onClick={onUnmount}
                  color="warning"
                  disabled={!isMounted}
                >
                  {t('danmaku.unmount')}
                </Button>
              )}
            </TabToolbar>

            {!isConnected && (
              <Alert severity="warning" square>
                {t('mountPage.alert.mountingDisabled')}
              </Alert>
            )}

            <Box flexGrow={1} overflow="auto">
              <Wrapper>
                <DanmakuTree
                  ref={danmakuTreeRef}
                  filter={filter}
                  typeFilter={selectedTypes as DanmakuSourceType[]}
                  onSelect={handleMountSingle}
                  onViewDanmaku={setViewingEpisode}
                  onSelectionChange={(ids) => setSelectionCount(ids.length)}
                  canMount={isConnected || isMounting}
                  multiselect={multiselect}
                />
              </Wrapper>
            </Box>

            <MountPageBottomBar
              open={multiselect}
              selectionCount={selectionCount}
              isMounting={isMounting}
              onCancel={handleToggleMultiselect}
              onMount={handleMountMultiple}
              onExport={handleExport}
              onDelete={handleDelete}
            />
          </>
        )}
      </CaptureKeypress>
    </TabLayout>
  )
}

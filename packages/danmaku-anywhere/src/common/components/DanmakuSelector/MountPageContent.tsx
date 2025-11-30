import type {
  DanmakuSourceType,
  GenericEpisodeLite,
} from '@danmaku-anywhere/danmaku-converter'
import { CheckBox, CheckBoxOutlined } from '@mui/icons-material'
import { Alert, Button, Chip, Collapse, Stack, Typography } from '@mui/material'
import type { ReactElement, ReactNode } from 'react'
import { Fragment, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDeleteSeason } from '@/common/anime/queries/useDeleteSeason'
import { CaptureKeypress } from '@/common/components/CaptureKeypress'
import {
  DanmakuTree,
  type DanmakuTreeApi,
} from '@/common/components/DanmakuSelector/DanmakuTree'
import { DanmakuViewer } from '@/common/components/DanmakuSelector/DanmakuViewer'
import { MountPageBottomBar } from '@/common/components/DanmakuSelector/MountPageBottomBar'
import { FilterButton } from '@/common/components/FilterButton'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { TypeSelector } from '@/common/components/TypeSelector'
import { useDeleteEpisode } from '@/common/danmaku/queries/useDeleteEpisode'
import { isNotCustom } from '@/common/danmaku/utils'
import { usePlatformInfo } from '@/common/hooks/usePlatformInfo'
import { useExportXml } from '@/popup/hooks/useExportXml'
import { ScrollBox } from '../layout/ScrollBox'

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
  const deleteSeasonMutation = useDeleteSeason()

  const handleMountSingle = (episode: GenericEpisodeLite) => {
    onMount([episode])
  }

  function getSelection() {
    // biome-ignore lint/style/noNonNullAssertion: guaranteed to be not null
    return danmakuTreeRef.current!.getSelectedEpisodes()
  }

  async function handleMountMultiple() {
    const { allEpisodes } = getSelection()

    if (allEpisodes.length === 0) {
      return
    }

    onMount(allEpisodes)
    danmakuTreeRef.current?.clearSelection()
    onToggleMultiselect()
  }

  async function handleExport() {
    const { allEpisodes } = getSelection()
    exportXmlMutation.mutate({
      filter: {
        ids: allEpisodes.filter((ep) => isNotCustom(ep)).map((ep) => ep.id),
      },
      customFilter: {
        ids: allEpisodes.filter((ep) => !isNotCustom(ep)).map((ep) => ep.id),
      },
    })
  }

  async function handleDelete() {
    const { episodes, customEpisodes, seasons } = getSelection()
    if (seasons.length > 0) {
      await Promise.all(
        seasons.map((season) => deleteSeasonMutation.mutateAsync(season.id))
      )
    }
    if (episodes.length > 0) {
      await deleteEpisodeMutation.mutateAsync({
        isCustom: false,
        filter: { ids: episodes.map((ep) => ep.id) },
      })
    }
    if (customEpisodes.length > 0) {
      await deleteEpisodeMutation.mutateAsync({
        isCustom: true,
        filter: { ids: customEpisodes.map((ep) => ep.id) },
      })
    }
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
    <TabLayout>
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
        {() => (
          <>
            <TabToolbar title={t('mountPage.pageTitle', 'Danmaku Library')}>
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
              <Chip
                variant="outlined"
                label={
                  <Stack direction="row" alignItems="center" gap={0.5}>
                    {multiselect ? (
                      <CheckBox fontSize="small" />
                    ) : (
                      <CheckBoxOutlined fontSize="small" />
                    )}
                    <Typography variant="body2" fontSize="small">
                      {t('common.multiselect', 'Multiselect')}
                    </Typography>
                  </Stack>
                }
                onClick={handleToggleMultiselect}
                color="primary"
              />
              {onUnmount && (
                <Collapse in={isMounted} unmountOnExit orientation="horizontal">
                  <Button
                    variant="outlined"
                    onClick={onUnmount}
                    color="warning"
                    disabled={!isMounted}
                    sx={{ whiteSpace: 'nowrap', ml: 1 }}
                  >
                    {t('danmaku.unmount', 'Unmount')}
                  </Button>
                </Collapse>
              )}
            </TabToolbar>

            {!isConnected && (
              <Alert severity="warning" square>
                {t(
                  'mountPage.alert.mountingDisabled',
                  'Cannot mount danmaku on this page'
                )}
              </Alert>
            )}

            <ScrollBox flexGrow={1} overflow="auto">
              <Wrapper>
                <DanmakuTree
                  ref={danmakuTreeRef}
                  filter={filter}
                  typeFilter={selectedTypes as DanmakuSourceType[]}
                  onSelect={handleMountSingle}
                  onViewDanmaku={setViewingEpisode}
                  onSelectionChange={(selection) =>
                    setSelectionCount(selection.length)
                  }
                  canMount={isConnected && !isMounting}
                  multiselect={multiselect}
                />
              </Wrapper>
            </ScrollBox>

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

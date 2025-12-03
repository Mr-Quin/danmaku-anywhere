import type {
  DanmakuSourceType,
  GenericEpisodeLite,
} from '@danmaku-anywhere/danmaku-converter'
import { UploadFile } from '@mui/icons-material'
import { Alert } from '@mui/material'
import type { ComponentType, ReactElement, ReactNode, RefObject } from 'react'
import { Fragment, useImperativeHandle, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDeleteSeason } from '@/common/anime/queries/useDeleteSeason'
import { CaptureKeypress } from '@/common/components/CaptureKeypress'
import { DanmakuViewer } from '@/common/components/DanmakuSelector/components/DanmakuViewer'
import { DragDropOverlay } from '@/common/components/DanmakuSelector/components/DragDropOverlay'
import { MountPageBottomBar } from '@/common/components/DanmakuSelector/components/MountPageBottomBar'
import { MountPageToolbar } from '@/common/components/DanmakuSelector/components/MountPageToolbar'
import {
  DanmakuTree,
  type DanmakuTreeApi,
} from '@/common/components/DanmakuSelector/tree/DanmakuTree'
import { useFileDragDrop } from '@/common/components/DanmakuSelector/useFileDragDrop'
import type { DrilldownMenuItemProps } from '@/common/components/DrilldownMenu'
import { ImportResultDialog } from '@/common/components/ImportPageCore/ImportResultDialog'
import { useDanmakuImport } from '@/common/components/ImportPageCore/useDanmakuImport'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { useDeleteEpisode } from '@/common/danmaku/queries/useDeleteEpisode'
import { isNotCustom } from '@/common/danmaku/utils'
import { usePlatformInfo } from '@/common/hooks/usePlatformInfo'
import { useExportXml } from '@/popup/hooks/useExportXml'
import { ImportResultContent } from '../ImportPageCore/ImportResultContent'
import { ScrollBox } from '../layout/ScrollBox'

interface ImportApi {
  import: (files: File[]) => void
  openFileInput: () => void
}

interface ImportDialogProps {
  apiRef: RefObject<ImportApi | null>
}

const ImportDialog = ({ apiRef }: ImportDialogProps) => {
  const { t } = useTranslation()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [showDialog, setShowDialog] = useState(false)

  const { handleImportClick, mutate, data, isPending, isError, error, reset } =
    useDanmakuImport()

  const handleFilesSelected = (files: File[]) => {
    mutate(files)
    setShowDialog(true)
  }

  const handleDialogClose = () => {
    setShowDialog(false)
    reset()
  }

  useImperativeHandle(apiRef, () => ({
    import: handleFilesSelected,
    openFileInput: () => fileInputRef.current?.click(),
  }))

  return (
    <>
      <input
        type="file"
        hidden
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files) {
            handleFilesSelected(Array.from(e.target.files))
          }
          e.target.value = ''
        }}
        accept=".json,.xml"
        multiple
      />
      <ImportResultDialog
        open={showDialog}
        title={t('importPage.import', 'Import Danmaku')}
        onClose={handleDialogClose}
        onImport={handleImportClick}
        disableImport={false}
      >
        {(params) => (
          <ImportResultContent
            importResult={params}
            isPending={isPending}
            isError={isError}
            error={error}
            data={data}
          />
        )}
      </ImportResultDialog>
    </>
  )
}

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
  selectorWrapper?: ComponentType<{ children: ReactNode }>
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

  const importDialogApiRef = useRef<ImportApi>(null)

  const menuItem: DrilldownMenuItemProps = {
    kind: 'item',
    id: 'import',
    label: t('importPage.import', 'Import Danmaku'),
    icon: <UploadFile />,
    onClick: () => importDialogApiRef.current?.openFileInput(),
  }

  const { isDragging, dragProps } = useFileDragDrop((files) =>
    importDialogApiRef.current?.import(files)
  )

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
    <TabLayout {...dragProps}>
      <DragDropOverlay in={isDragging} />
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
        <MountPageToolbar
          filter={filter}
          onFilterChange={onFilterChange}
          isFilterOpen={isFilterOpen}
          setIsFilterOpen={setIsFilterOpen}
          selectedTypes={selectedTypes}
          onSelectedTypesChange={onSelectedTypesChange}
          multiselect={multiselect}
          onToggleMultiselect={handleToggleMultiselect}
          onUnmount={onUnmount}
          isMounted={isMounted}
          menuItem={menuItem}
        />

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
      </CaptureKeypress>

      <ImportDialog apiRef={importDialogApiRef} />
    </TabLayout>
  )
}

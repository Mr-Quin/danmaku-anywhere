import type {
  DanmakuSourceType,
  GenericEpisodeLite,
} from '@danmaku-anywhere/danmaku-converter'
import { UploadFile } from '@mui/icons-material'
import { Alert, Button, Collapse } from '@mui/material'
import type { ReactElement } from 'react'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CaptureKeypress } from '@/common/components/CaptureKeypress'
import { DanmakuViewer } from '@/common/components/DanmakuSelector/components/DanmakuViewer'
import { DragDropOverlay } from '@/common/components/DanmakuSelector/components/DragDropOverlay'
import { MountPageBottomBar } from '@/common/components/DanmakuSelector/components/MountPageBottomBar'
import { MountPageToolbar } from '@/common/components/DanmakuSelector/components/MountPageToolbar'
import {
  DanmakuTree,
  type DanmakuTreeApi,
} from '@/common/components/DanmakuSelector/tree/DanmakuTree'
import { useDanmakuTreeActions } from '@/common/components/DanmakuSelector/useDanmakuTreeActions'
import { useImportFlow } from '@/common/components/DanmakuSelector/useImportFlow'
import { ImportResultDialog } from '@/common/components/ImportPageCore/ImportResultDialog'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { usePlatformInfo } from '@/common/hooks/usePlatformInfo'
import { ImportResultContent } from '../ImportPageCore/ImportResultContent'
import { ScrollBox } from '../layout/ScrollBox'
import type { DAMenuItemConfig } from '../Menu/DAMenuItemConfig'

export type MountAvailability =
  | { kind: 'pending' }
  | { kind: 'connected' }
  | { kind: 'unsupported' }
  | { kind: 'disabled' }
  | {
      kind: 'noConfig'
      url: string
      pattern: string
      name: string
    }

const CONNECTED_AVAILABILITY: MountAvailability = { kind: 'connected' }

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
  availability?: MountAvailability
  onGoSearch: () => void
  onGoCreateMountConfig?: () => void
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
  availability = CONNECTED_AVAILABILITY,
  onGoSearch,
  onGoCreateMountConfig,
}: MountPageContentProps): ReactElement => {
  const { t } = useTranslation()
  const { isMobile } = usePlatformInfo()

  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [viewingEpisode, setViewingEpisode] =
    useState<GenericEpisodeLite | null>(null)
  const [selectionCount, setSelectionCount] = useState(0)

  const danmakuTreeRef = useRef<DanmakuTreeApi>(null)

  const importFlow = useImportFlow()

  const treeActions = useDanmakuTreeActions({
    treeRef: danmakuTreeRef,
    onMount,
    onToggleMultiselect,
  })

  const handleToggleMultiselect = () => {
    danmakuTreeRef.current?.clearSelection()
    onToggleMultiselect()
  }

  const menuItems = useMemo<DAMenuItemConfig[]>(
    () => [
      {
        kind: 'item',
        id: 'import',
        label: t('importPage.import', 'Import Danmaku'),
        icon: <UploadFile />,
        onClick: importFlow.openFileInput,
      },
      {
        kind: 'item',
        id: 'importFolder',
        label: t('importPage.importFolder', 'Import Danmaku Folder'),
        icon: <UploadFile />,
        onClick: importFlow.openFolderInput,
      },
    ],
    [importFlow, t]
  )

  const showAlert =
    availability.kind !== 'connected' && availability.kind !== 'pending'

  // Keep the last visible availability mounted so Collapse can animate the
  // alert out after the state flips back to connected/pending.
  const displayedAvailabilityRef = useRef<MountAvailability | null>(null)
  if (showAlert) {
    displayedAvailabilityRef.current = availability
  }
  const displayedAvailability = displayedAvailabilityRef.current

  function renderAlertContent(av: MountAvailability) {
    if (av.kind === 'disabled') {
      return (
        <Alert severity="warning" square>
          {t(
            'mountPage.alert.extensionDisabled',
            'Danmaku Anywhere is disabled'
          )}
        </Alert>
      )
    }
    if (av.kind === 'unsupported') {
      return (
        <Alert severity="warning" square>
          {t(
            'mountPage.alert.pageUnsupported',
            'This page cannot host danmaku'
          )}
        </Alert>
      )
    }
    if (av.kind === 'noConfig') {
      return (
        <Alert
          severity="info"
          square
          action={
            <Button
              onClick={onGoCreateMountConfig}
              size="small"
              color="inherit"
              variant="text"
            >
              {t('mountPage.alert.createMountConfig', 'Create mount config')}
            </Button>
          }
        >
          {t('mountPage.alert.noMountConfig', 'No mount config for this site')}
        </Alert>
      )
    }
    return null
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
    <TabLayout {...importFlow.dragProps}>
      <DragDropOverlay in={importFlow.isDragging} />

      <input
        type="file"
        hidden
        ref={importFlow.fileInputRef}
        onChange={(e) => {
          if (e.target.files) {
            importFlow.handleFiles(Array.from(e.target.files))
          }
          e.target.value = ''
        }}
        accept=".json,.xml,.zip"
        multiple
      />

      <input
        type="file"
        hidden
        ref={importFlow.folderInputRef}
        onChange={(e) => {
          if (e.target.files) {
            importFlow.handleFiles(Array.from(e.target.files))
          }
          e.target.value = ''
        }}
        // @ts-expect-error non-standard attribute, but allows selecting folder to upload
        webkitdirectory=""
      />

      <CaptureKeypress
        onChange={onFilterChange}
        value={filter}
        disabled={isFilterOpen || isMobile}
        autoFocus
        boxProps={{ display: 'flex', flexDirection: 'column', height: '100%' }}
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
          menuItems={menuItems}
          onSelectAll={() => danmakuTreeRef.current?.selectAll()}
          clearSelection={() => danmakuTreeRef.current?.clearSelection()}
          selectionCount={selectionCount}
        />

        <Collapse in={showAlert} unmountOnExit>
          {displayedAvailability !== null &&
            renderAlertContent(displayedAvailability)}
        </Collapse>

        <ScrollBox flexGrow={1} overflow="auto">
          <DanmakuTree
            ref={danmakuTreeRef}
            filter={filter}
            typeFilter={selectedTypes as DanmakuSourceType[]}
            onSelect={(ep) => onMount([ep])}
            onViewDanmaku={setViewingEpisode}
            onSelectionChange={(s) => setSelectionCount(s.length)}
            canMount={availability.kind === 'connected' && !isMounting}
            multiselect={multiselect}
            onImport={importFlow.openFileInput}
            onGoSearch={onGoSearch}
          />
        </ScrollBox>

        <MountPageBottomBar
          open={multiselect}
          selectionCount={selectionCount}
          isMounting={isMounting}
          onCancel={handleToggleMultiselect}
          onMount={treeActions.handleMountMultiple}
          onExport={treeActions.handleExport}
          onExportBackup={treeActions.handleExportBackup}
          onDelete={treeActions.handleDelete}
        />
      </CaptureKeypress>

      <ImportResultDialog
        open={importFlow.showResultDialog}
        title={t('importPage.import', 'Import Danmaku')}
        onClose={importFlow.closeDialog}
        onImport={importFlow.confirmImport}
        disableImport={
          importFlow.importState.isPending || importFlow.importState.isError
        }
      >
        {(params) => (
          <ImportResultContent
            importResult={params}
            {...importFlow.importState}
          />
        )}
      </ImportResultDialog>
    </TabLayout>
  )
}

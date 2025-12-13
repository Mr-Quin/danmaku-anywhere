import type {
  DanmakuSourceType,
  GenericEpisodeLite,
} from '@danmaku-anywhere/danmaku-converter'
import { UploadFile } from '@mui/icons-material'
import { Alert } from '@mui/material'
import type { ComponentType, ReactElement, ReactNode } from 'react'
import { Fragment, useRef, useState } from 'react'
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

  const menuItems: DAMenuItemConfig[] = [
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
  ]

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
              onSelect={(ep) => onMount([ep])}
              onViewDanmaku={setViewingEpisode}
              onSelectionChange={(s) => setSelectionCount(s.length)}
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
          onMount={treeActions.handleMountMultiple}
          onExport={treeActions.handleExport}
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

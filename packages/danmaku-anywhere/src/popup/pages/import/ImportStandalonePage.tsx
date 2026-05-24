import { CreateNewFolder, UploadFile } from '@mui/icons-material'
import { Box, Button, Stack, Typography } from '@mui/material'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { DragDropOverlay } from '@/common/components/DanmakuSelector/components/DragDropOverlay'
import { HiddenImportInputs } from '@/common/components/DanmakuSelector/HiddenImportInputs'
import { useImportFlow } from '@/common/components/DanmakuSelector/useImportFlow'
import { ImportResultContent } from '@/common/components/ImportPageCore/ImportResultContent'
import { ImportResultDialog } from '@/common/components/ImportPageCore/ImportResultDialog'

export function ImportStandalonePage(): ReactElement {
  const { t } = useTranslation()
  const importFlow = useImportFlow()

  return (
    <Box
      {...importFlow.dragProps}
      sx={{
        position: 'relative',
        height: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 2,
      }}
    >
      <DragDropOverlay in={importFlow.isDragging} />

      <Typography variant="h4">
        {t('importPage.import', 'Import Danmaku')}
      </Typography>
      <Stack direction="row" spacing={1}>
        <Button
          variant="outlined"
          startIcon={<UploadFile />}
          onClick={importFlow.openFileInput}
        >
          {t('importPage.pickFiles', 'Pick files')}
        </Button>
        <Button
          variant="outlined"
          startIcon={<CreateNewFolder />}
          onClick={importFlow.openFolderInput}
        >
          {t('importPage.pickFolder', 'Pick folder')}
        </Button>
      </Stack>

      <HiddenImportInputs
        fileInputRef={importFlow.fileInputRef}
        folderInputRef={importFlow.folderInputRef}
        onFiles={importFlow.handleFiles}
      />

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
    </Box>
  )
}

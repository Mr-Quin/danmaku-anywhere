import { CreateNewFolder, UploadFile } from '@mui/icons-material'
import { Box, Button, Stack, Typography } from '@mui/material'
import { type ReactElement, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { useImportFlow } from '@/common/components/DanmakuSelector/useImportFlow'
import { ImportResultContent } from '@/common/components/ImportPageCore/ImportResultContent'
import { ImportResultDialog } from '@/common/components/ImportPageCore/ImportResultDialog'
import { VALID_EXTENSIONS } from '@/common/components/ImportPageCore/useDanmakuImport'

type AutoImport = 'files' | 'folder'

function parseAutoImport(value: string | null): AutoImport | undefined {
  if (value === 'files' || value === 'folder') {
    return value
  }
  return undefined
}

export function ImportStandalonePage(): ReactElement {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const autoImport = parseAutoImport(searchParams.get('autoImport'))

  const importFlow = useImportFlow()
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current || !autoImport) {
      return
    }
    firedRef.current = true
    if (autoImport === 'files') {
      importFlow.openFileInput()
    } else {
      importFlow.openFolderInput()
    }
  }, [autoImport, importFlow])

  function handleDialogClose() {
    importFlow.closeDialog()
    window.close()
  }

  return (
    <Box
      sx={{
        height: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        textAlign: 'center',
      }}
    >
      <Typography variant="h6" gutterBottom>
        {t('importPage.import', 'Import Danmaku')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t(
          'importPage.standaloneHint',
          'Pick files or a folder to import. This window closes when import finishes.'
        )}
      </Typography>
      <Stack direction="row" spacing={1}>
        <Button
          variant="outlined"
          startIcon={<UploadFile />}
          onClick={importFlow.openFileInput}
        >
          {t('importPage.import', 'Import Danmaku')}
        </Button>
        <Button
          variant="outlined"
          startIcon={<CreateNewFolder />}
          onClick={importFlow.openFolderInput}
        >
          {t('importPage.importFolder', 'Import Danmaku Folder')}
        </Button>
      </Stack>

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
        accept={[...VALID_EXTENSIONS, '.zip'].join(',')}
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

      <ImportResultDialog
        open={importFlow.showResultDialog}
        title={t('importPage.import', 'Import Danmaku')}
        onClose={handleDialogClose}
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

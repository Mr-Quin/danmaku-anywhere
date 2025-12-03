import { Box, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImportResultContent } from '@/common/components/ImportPageCore/ImportResultContent'
import { ImportResultDialog } from '@/common/components/ImportPageCore/ImportResultDialog'
import { useDanmakuImport } from '@/common/components/ImportPageCore/useDanmakuImport'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { FileUpload } from '@/popup/component/FileUpload'

export const ImportPageCore = () => {
  const { t } = useTranslation()
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

  return (
    <TabLayout>
      <TabToolbar title={t('importPage.import', 'Import Danmaku')} />
      <Box p={2}>
        <Typography variant="subtitle2" gutterBottom>
          {t(
            'importPage.importDesc',
            'When importing local danmaku, file names will be used as episode names. Supports .json and .xml files'
          )}
        </Typography>
        <FileUpload
          onFilesSelected={handleFilesSelected}
          accept=".json,.xml"
          multiple={true}
        />
      </Box>
      <ImportResultDialog
        open={showDialog}
        title={t('importPage.import', 'Import Danmaku')}
        onClose={handleDialogClose}
        onImport={handleImportClick}
        disableImport={isPending || isError}
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
    </TabLayout>
  )
}

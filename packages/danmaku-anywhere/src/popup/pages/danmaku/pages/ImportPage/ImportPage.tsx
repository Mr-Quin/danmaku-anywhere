import {
  Box,
  Button,
  FormHelperText,
  Paper,
  Tooltip,
  useTheme,
} from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { ImportCustomDanmaku } from '@/popup/pages/danmaku/pages/ImportPage/components/ImportCustomDanmaku'
import { ImportExportedDanmaku } from '@/popup/pages/danmaku/pages/ImportPage/components/ImportExportedDanmaku'
import { useParseCustomDanmaku } from '@/popup/pages/danmaku/pages/ImportPage/hooks/useParseCustomDanmaku'
import { useParseExportedDanmaku } from '@/popup/pages/danmaku/pages/ImportPage/hooks/useParseExportedDanmaku'
import type { FileContent } from '@/popup/pages/danmaku/pages/ImportPage/hooks/useUploadDanmaku'
import { useUploadDanmaku } from '@/popup/pages/danmaku/pages/ImportPage/hooks/useUploadDanmaku'

export const ImportPage = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  const theme = useTheme()

  const [fileContent, setFileContent] = useState<FileContent[] | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [importType, setImportType] = useState<'exported' | 'custom'>(
    'exported'
  )

  const { selectFiles, bindDrop, isDraggingOver } = useUploadDanmaku({
    onData: (data) => setFileContent(data),
  })

  const { parse: handleParseCustom, data } = useParseCustomDanmaku({
    onError: (e) => {
      toast.error(e.message)
    },
    onSuccess: (data) => {
      if (data) setShowDialog(true)
    },
  })

  const { parse: handleParseExported, data: exportedData } =
    useParseExportedDanmaku({
      onError: (e) => {
        toast.error(e.message)
      },
      onSuccess: (data) => {
        if (data) setShowDialog(true)
      },
    })

  const handleSelectFiles = () => {
    selectFiles()
  }

  const handleImportCustom = async () => {
    setImportType('custom')
    if (fileContent) handleParseCustom(fileContent)
  }

  const handleImportExported = async () => {
    setImportType('exported')
    if (fileContent) handleParseExported(fileContent)
  }

  return (
    <TabLayout>
      <TabToolbar title={t('danmakuPage.upload.upload')} />
      <Paper
        {...bindDrop()}
        sx={{
          p: 2,
          flexGrow: 1,
        }}
        elevation={isDraggingOver ? 4 : 1}
      >
        <Button onClick={handleSelectFiles} variant="contained">
          {t('danmakuPage.upload.selectFiles')}
        </Button>
        <FormHelperText>
          {t('danmakuPage.upload.help.selectFiles')}
        </FormHelperText>
        <pre
          style={{
            fontSize: theme.typography.body2.fontSize,
          }}
        >
          {fileContent?.map((data) => {
            return <div key={data.file}>{data.file}</div>
          })}
        </pre>

        {fileContent && fileContent.length > 0 && (
          <Box mt={4}>
            <Tooltip title={t('danmakuPage.upload.help.importExported')}>
              <Button onClick={handleImportExported} variant="contained">
                {t('danmakuPage.upload.importExported')}
              </Button>
            </Tooltip>

            <Tooltip title={t('danmakuPage.upload.help.importCustom')}>
              <Button
                onClick={handleImportCustom}
                variant="contained"
                sx={{ ml: 2 }}
              >
                {t('danmakuPage.upload.importCustom')}
              </Button>
            </Tooltip>
          </Box>
        )}
      </Paper>

      {importType === 'custom' && data && (
        <ImportCustomDanmaku
          data={data}
          onClose={() => setShowDialog(false)}
          open={showDialog}
        />
      )}
      {importType === 'exported' && exportedData && (
        <ImportExportedDanmaku
          data={exportedData}
          onClose={() => setShowDialog(false)}
          open={showDialog}
        />
      )}
    </TabLayout>
  )
}

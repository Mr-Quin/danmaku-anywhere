import { ChevronLeft } from '@mui/icons-material'
import { Box, Button, FormHelperText, IconButton } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { useToast } from '@/common/components/Toast/toastStore'
import { TabToolbar } from '@/popup/component/TabToolbar'
import { TabLayout } from '@/popup/layout/TabLayout'
import { ImportCustomDanmaku } from '@/popup/pages/danmaku/pages/ImportPage/components/ImportCustomDanmaku'
import { ImportExportedDanmaku } from '@/popup/pages/danmaku/pages/ImportPage/components/ImportExportedDanmaku'
import { useParseCustomDanmaku } from '@/popup/pages/danmaku/pages/ImportPage/useParseCustomDanmaku'
import { useParseExportedDanmaku } from '@/popup/pages/danmaku/pages/ImportPage/useParseExportedDanmaku'

export const ImportPage = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  const [showDialog, setShowDialog] = useState(false)
  const [importType, setImportType] = useState<'exported' | 'custom'>(
    'exported'
  )

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

  const handleImportCustom = () => {
    setImportType('custom')
    handleParseCustom()
  }

  const handleImportExported = () => {
    setImportType('exported')
    handleParseExported()
  }

  return (
    <TabLayout>
      <TabToolbar
        title={t('danmakuPage.upload.upload')}
        leftElement={
          <IconButton edge="start" component={Link} to="..">
            <ChevronLeft />
          </IconButton>
        }
      />
      <Box p={2}>
        <Button onClick={handleImportExported} variant="contained">
          {t('danmakuPage.upload.importExported')}
        </Button>
        <FormHelperText>
          {t('danmakuPage.upload.help.importExported')}
        </FormHelperText>
        <Button onClick={handleImportCustom} variant="contained" sx={{ mt: 2 }}>
          {t('danmakuPage.upload.importCustom')}
        </Button>
        <FormHelperText>
          {t('danmakuPage.upload.help.importCustom')}
        </FormHelperText>
      </Box>

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

import { combinedPolicyService } from '@/common/options/combinedPolicy'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { FileUpload } from '@/popup/component/FileUpload'
import {
  ImportResultDialog,
  type ImportResultRenderParams,
} from '@/popup/component/ImportResultDialog'
import { PreFormat } from '@/popup/component/PreFormat'
import { useGoBack } from '@/popup/hooks/useGoBack'
import { PresetsList } from '@/popup/pages/config/pages/import/PresetsList'
import { Box, Divider, Tab, Tabs, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

type ImportResult = {
  succeeded: string[]
  errored: string[]
}

export const ImportConfigPage = () => {
  const { t } = useTranslation()
  const goBack = useGoBack()

  const [tabValue, setTabValue] = useState('presets')
  const [showDialog, setShowDialog] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const importMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const succeeded: string[] = []
      const errored: string[] = []
      for (const file of files) {
        const result = await combinedPolicyService.import(
          JSON.parse(await file.text())
        )
        if (result) {
          succeeded.push(file.name)
        } else {
          errored.push(file.name)
        }
      }
      return { succeeded, errored } satisfies ImportResult
    },
  })

  const handleSelectFiles = async (files: File[]) => {
    setSelectedFiles(files)
    setShowDialog(true)
  }

  const handleCloseDialog = () => {
    setShowDialog(false)
    setSelectedFiles([])
  }

  const handleImport = async () => {
    return importMutation.mutateAsync(selectedFiles)
  }

  const renderDialogContent = ({
    status,
    error,
    result,
  }: ImportResultRenderParams<ImportResult>) => {
    switch (status) {
      case 'uploading':
      case 'confirmUpload': {
        return (
          <>
            <Typography variant="subtitle1" gutterBottom>
              {t('importPage.willImport', { count: selectedFiles.length })}
            </Typography>
            <PreFormat>
              <ul>
                {selectedFiles.map((file, i) => (
                  <li key={i}>{file.name}</li>
                ))}
              </ul>
            </PreFormat>
          </>
        )
      }
      case 'uploadSuccess': {
        return (
          <>
            {result.succeeded.length > 0 && (
              <>
                <Typography color="success.main" variant="subtitle1">
                  {t('importPage.importSuccess', {
                    count: result.succeeded.length,
                  })}
                </Typography>
                <PreFormat>
                  <ul>
                    {result.succeeded.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </PreFormat>
              </>
            )}
            {result.errored.length > 0 && (
              <>
                <Typography color="error" variant="subtitle1">
                  {t('importPage.importError', {
                    count: result.errored.length,
                  })}
                </Typography>
                <PreFormat variant="error">
                  <ul>
                    {result.errored.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </PreFormat>
              </>
            )}
          </>
        )
      }
      case 'error': {
        return (
          <>
            <Typography color="error.main" variant="subtitle1">
              {t('error.unknown')}
            </Typography>
            <PreFormat>{error.message}</PreFormat>
          </>
        )
      }
      default:
        return null
    }
  }

  const handleTabChange = (_: any, newValue: string) => {
    setTabValue(newValue)
  }

  return (
    <TabLayout>
      <TabToolbar
        title={t('configPage.import.name')}
        showBackButton
        onGoBack={goBack}
      />
      <Tabs value={tabValue} onChange={handleTabChange}>
        <Tab label={t('configPage.import.presets')} value="presets" />
        <Tab label={t('configPage.import.fileUpload')} value="upload" />
      </Tabs>
      <Divider />
      {tabValue === 'upload' && (
        <Box p={2}>
          <FileUpload
            onFilesSelected={handleSelectFiles}
            accept=".json"
            multiple={true}
          />
        </Box>
      )}
      {tabValue === 'presets' && <PresetsList />}
      <ImportResultDialog
        open={showDialog}
        title={t('configPage.import.name')}
        onClose={handleCloseDialog}
        onImport={handleImport}
        disableImport={false}
      >
        {renderDialogContent}
      </ImportResultDialog>
    </TabLayout>
  )
}

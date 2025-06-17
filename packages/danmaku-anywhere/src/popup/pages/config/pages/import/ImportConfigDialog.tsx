import { ModalDialog } from '@/common/components/ModalDialog'
import { combinedPolicyService } from '@/common/options/combinedPolicy'
import { FileUpload } from '@/popup/component/FileUpload'
import {
  ImportResultDialog,
  type ImportResultRenderParams,
} from '@/popup/component/ImportResultDialog'
import { PreFormat } from '@/popup/component/PreFormat'
import { RepoConfigList } from '@/popup/pages/config/pages/import/RepoConfigList'
import { Box, Divider, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

type ImportResult = {
  succeeded: string[]
  errored: string[]
}

export type ImportKind = 'file' | 'repo'

type ImportConfigPageProps = {
  open: boolean
  onClose: () => void
  importKind: ImportKind
}

export const ImportConfigDialog = ({
  open,
  onClose,
  importKind = 'repo',
}: ImportConfigPageProps) => {
  const { t } = useTranslation()

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

  return (
    <ModalDialog
      open={open}
      dialogTitle={
        importKind === 'repo'
          ? t('configPage.import.fromRepo')
          : t('configPage.import.fromFile')
      }
      onClose={onClose}
    >
      <Divider />
      {importKind === 'file' && (
        <Box p={2}>
          <FileUpload
            onFilesSelected={handleSelectFiles}
            accept=".json"
            multiple={true}
          />
        </Box>
      )}
      {importKind === 'repo' && <RepoConfigList />}
      <ImportResultDialog
        open={showDialog}
        title={t('configPage.import.name')}
        onClose={handleCloseDialog}
        onImport={handleImport}
        disableImport={false}
      >
        {renderDialogContent}
      </ImportResultDialog>
    </ModalDialog>
  )
}

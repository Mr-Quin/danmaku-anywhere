import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import type {
  DanmakuImportData,
  DanmakuImportResult,
} from '@/common/danmaku/dto'
import {
  customEpisodeQueryKeys,
  episodeQueryKeys,
  seasonQueryKeys,
} from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { PreFormat } from '@/popup/component/PreFormat'
import { Collapsible } from '@/popup/pages/import/components/Collapsible'
import { xmlToJSON } from '@danmaku-anywhere/danmaku-converter'
import { Box, List, ListItem, Typography } from '@mui/material'
import type {} from '@mui/material/styles'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileUpload } from '../../component/FileUpload'
import {
  ImportResultDialog,
  type ImportResultRenderParams,
} from '../../component/ImportResultDialog'

export const ImportPage = () => {
  const { t } = useTranslation()

  const [showDialog, setShowDialog] = useState(false)

  const queryClient = useQueryClient()

  // not actually a mutation, just using this to manage state
  const { mutate, data, error, reset, isError, isPending } = useMutation({
    mutationFn: async (files: File[]) => {
      const getJson = (text: string, fileName: string) => {
        const isXml = fileName.endsWith('.xml')
        const data: unknown = isXml ? xmlToJSON(text) : JSON.parse(text)
        return data
      }

      return Promise.all(
        files.map(async (file) => {
          const text = await file.text()
          const data = getJson(text, file.name)
          return {
            title: file.name.substring(0, file.name.lastIndexOf('.')), // remove extension
            data,
          } satisfies DanmakuImportData
        })
      )
    },
  })

  const handleFilesSelected = async (files: File[]) => {
    mutate(files)
    setShowDialog(true)
  }

  const handleDialogClose = () => {
    setShowDialog(false)
    reset()
  }

  const handleImportClick = async () => {
    if (!data || data.length === 0) {
      throw new Error('No files to import')
    }
    const { data: results } = await chromeRpcClient.episodeImport(data)

    void queryClient.invalidateQueries({
      queryKey: seasonQueryKeys.all(),
    })
    void queryClient.invalidateQueries({
      queryKey: episodeQueryKeys.all(),
    })
    void queryClient.invalidateQueries({
      queryKey: customEpisodeQueryKeys.all(),
    })

    return results
  }

  const renderDialogContent = ({
    status,
    error: importError,
    result,
  }: ImportResultRenderParams<DanmakuImportResult>) => {
    switch (status) {
      case 'uploading':
      case 'confirmUpload': {
        if (isPending) {
          return <FullPageSpinner />
        }
        if (isError) {
          return (
            <>
              <Typography color="error.main">
                {t('importPage.parseError')}
              </Typography>
              <PreFormat variant="error">{error.message}</PreFormat>
            </>
          )
        }
        return (
          <>
            {data && (
              <>
                <Typography variant="subtitle1" gutterBottom>
                  {t('importPage.willImport', { count: data.length })}
                </Typography>
                <PreFormat>
                  <ul>
                    {data.map((item, i) => (
                      <li key={i}>{item.title}</li>
                    ))}
                  </ul>
                </PreFormat>
              </>
            )}
          </>
        )
      }
      case 'uploadSuccess': {
        return (
          <>
            {result.success.length > 0 && (
              <>
                <Typography color="success.main" variant="subtitle1">
                  {t('importPage.importSuccess', {
                    count: result.success.length,
                  })}
                </Typography>
                <PreFormat disableCopy>
                  <List>
                    {result.success.map((item, i) => {
                      return (
                        <ListItem key={i}>
                          {item.type === 'Custom' ? (
                            <span>{item.title}</span>
                          ) : (
                            <Collapsible title={item.title}>
                              {item.result.skipped > 0 && (
                                <p>Skipped {item.result.skipped}</p>
                              )}
                              {Object.entries(item.result.imported).map(
                                ([seasonTitle, episodes], i) => {
                                  return (
                                    <>
                                      {seasonTitle}
                                      <ul key={i}>
                                        {episodes.map((episode, j) => {
                                          return (
                                            <li key={j}>{episode.title}</li>
                                          )
                                        })}
                                      </ul>
                                    </>
                                  )
                                }
                              )}
                            </Collapsible>
                          )}
                        </ListItem>
                      )
                    })}
                  </List>
                </PreFormat>
              </>
            )}
            {result.error.length > 0 && (
              <>
                <Typography color="error.main" variant="subtitle1">
                  {t('importPage.importError', { count: result.error.length })}
                </Typography>
                <PreFormat variant="error">
                  {result.error.map((item, i) => {
                    return (
                      <Collapsible key={i} title={item.title} defaultOpen>
                        {item.message}
                      </Collapsible>
                    )
                  })}
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
            <PreFormat variant="error">{importError.message}</PreFormat>
          </>
        )
      }
      default:
        return null
    }
  }

  return (
    <TabLayout>
      <TabToolbar title={t('importPage.import')} />
      <Box p={2}>
        <Typography variant="subtitle2" gutterBottom>
          {t('importPage.importDesc')}
        </Typography>
        <FileUpload
          onFilesSelected={handleFilesSelected}
          accept=".json,.xml"
          multiple={true}
        />
      </Box>
      <ImportResultDialog
        open={showDialog}
        title={t('importPage.import')}
        onClose={handleDialogClose}
        onImport={handleImportClick}
        disableImport={isPending || isError}
      >
        {renderDialogContent}
      </ImportResultDialog>
    </TabLayout>
  )
}

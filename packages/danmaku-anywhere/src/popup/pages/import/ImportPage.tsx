import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import type {
  CustomDanmakuImportData,
  CustomDanmakuImportResult,
} from '@/common/danmaku/dto'
import { customEpisodeQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { Collapsible } from '@/popup/pages/import/components/Collapsible'
import { xmlToJSON } from '@danmaku-anywhere/danmaku-converter'
import { ContentCopy } from '@mui/icons-material'
import { Box, IconButton, Typography, styled, useTheme } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type KeyboardEvent, type ReactNode, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileUpload } from './components/FileUpload'
import {
  ImportResultDialog,
  type ImportResultRenderParams,
} from './components/ImportResultDialog'

type PreFormatProps = {
  variant?: 'normal' | 'error'
  children: ReactNode
  sx?: SxProps<Theme>
}

const StyledPreFormatBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'variant',
})<{
  variant?: 'normal' | 'error'
}>(({ theme, variant }) => ({
  position: 'relative',
  padding: theme.spacing(2),
  overflow: 'auto',
  maxHeight: 200,
  backgroundColor:
    theme.palette.mode === 'dark'
      ? theme.palette.grey[900]
      : theme.palette.grey[100],
  border:
    variant === 'error' ? `1px solid ${theme.palette.error.main}` : 'none',
  borderRadius: theme.shape.borderRadius,

  '&:focus, &:focus-within': {
    outline: `2px solid ${theme.palette.primary.main}`,
    boxShadow: `0 0 0 2px ${theme.palette.primary.light}`,
  },
}))

const PreFormat = ({ variant, sx, children }: PreFormatProps) => {
  const theme = useTheme()
  const preRef = useRef<HTMLPreElement>(null)

  const handleCopy = async () => {
    if (preRef.current) {
      try {
        await navigator.clipboard.writeText(preRef.current.innerText)
      } catch (_) {
        // ignore error
      }
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
      event.preventDefault()
      if (preRef.current) {
        const selection = window.getSelection()
        const range = document.createRange()
        range.selectNodeContents(preRef.current)
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
    }
  }

  return (
    <StyledPreFormatBox
      variant={variant}
      sx={sx}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <IconButton
        onClick={handleCopy}
        size="small"
        sx={{
          position: 'absolute',
          zIndex: 1,
          top: theme.spacing(0.5),
          right: theme.spacing(0.5),
          p: 1,
        }}
      >
        <ContentCopy fontSize="small" />
      </IconButton>
      <pre
        ref={preRef}
        style={{
          fontSize: theme.typography.caption.fontSize,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          color: variant === 'error' ? 'red' : 'inherit',
        }}
      >
        {children}
      </pre>
    </StyledPreFormatBox>
  )
}

const getJson = async (text: string, fileName: string) => {
  const isXml = fileName.endsWith('.xml')
  const data: unknown = isXml ? await xmlToJSON(text) : JSON.parse(text)
  return data
}

const processUploadedFiles = async (files: File[]) => {
  return Promise.all(
    files.map(async (file) => {
      const text = await file.text()
      const data = await getJson(text, file.name)
      return {
        title: file.name,
        comments: data,
      } satisfies CustomDanmakuImportData
    })
  )
}

export const ImportPage = () => {
  const { t } = useTranslation()

  const [showDialog, setShowDialog] = useState(false)

  const queryClient = useQueryClient()

  // not actually a mutation, just using this to manage state
  const { mutate, data, error, reset, isError, isPending } = useMutation({
    mutationFn: async (files: File[]) => {
      return processUploadedFiles(files)
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
    const { data: results } = await chromeRpcClient.danmakuCreateCustom(data)

    void queryClient.invalidateQueries({
      queryKey: customEpisodeQueryKeys.all(),
    })

    return results
  }

  const renderDialogContent = ({
    status,
    error: importError,
    result,
  }: ImportResultRenderParams<CustomDanmakuImportResult>) => {
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
            {result.succeeded.length > 0 && (
              <>
                <Typography color="success.main" variant="subtitle1">
                  {t('importPage.importSuccess', {
                    count: result.succeeded.length,
                  })}
                </Typography>
                <PreFormat>
                  <ul>
                    {result.succeeded.map((item, i) => {
                      return <li key={i}>{item}</li>
                    })}
                  </ul>
                </PreFormat>
              </>
            )}
            {result.errors.length > 0 && (
              <>
                <Typography color="error.main" variant="subtitle1">
                  {t('importPage.importError', { count: result.errors.length })}
                </Typography>
                {result.errors.map((item, i) => {
                  return (
                    <PreFormat variant="error" key={i}>
                      <Collapsible title={item.title} defaultOpen>
                        {item.error}
                      </Collapsible>
                    </PreFormat>
                  )
                })}
              </>
            )}
          </>
        )
      }
      case 'error': {
        return (
          <>
            <Typography color="error.main" variant="subtitle1">
              {t('common.error.unknown')}
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
      <TabToolbar title={t('importPage.importLocal')} />
      <Box p={2}>
        <Typography variant="subtitle2" gutterBottom>
          {t('importPage.importLocalDesc')}
        </Typography>
        <FileUpload
          onFilesSelected={handleFilesSelected}
          accept=".json,.xml"
          multiple={true}
        />
      </Box>
      <ImportResultDialog
        open={showDialog}
        title={t('importPage.importLocal')}
        onClose={handleDialogClose}
        onImport={handleImportClick}
        disableImport={isPending || isError}
      >
        {renderDialogContent}
      </ImportResultDialog>
    </TabLayout>
  )
}

import { List, ListItem, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import type { ImportResultRenderParams } from '@/common/components/ImportPageCore/ImportResultDialog'
import type {
  DanmakuImportData,
  DanmakuImportResult,
} from '@/common/danmaku/dto'
import { PreFormat } from '@/popup/component/PreFormat'
import { Collapsible } from '@/popup/pages/import/components/Collapsible'

export interface ImportResultContentProps {
  importResult: ImportResultRenderParams<DanmakuImportResult>
  isPending: boolean
  isError: boolean
  error: Error | null
  data: DanmakuImportData[] | undefined
}

export const ImportResultContent = ({
  importResult,
  isPending,
  isError,
  error,
  data,
}: ImportResultContentProps) => {
  const { t } = useTranslation()

  const { status, error: importError, result } = importResult

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
              {t('importPage.parseError', 'Failed to parse file')}
            </Typography>
            <PreFormat variant="error">{error?.message}</PreFormat>
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
                                  <div key={i}>
                                    {seasonTitle}
                                    <ul>
                                      {episodes.map((episode, j) => {
                                        return <li key={j}>{episode.title}</li>
                                      })}
                                    </ul>
                                  </div>
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
            {t('error.unknown', 'Something went wrong.')}
          </Typography>
          <PreFormat variant="error">{importError?.message}</PreFormat>
        </>
      )
    }
    default:
      return null
  }
}

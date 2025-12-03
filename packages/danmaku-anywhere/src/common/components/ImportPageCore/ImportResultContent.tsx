import { ExpandMore, InsertDriveFile } from '@mui/icons-material'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import type { ImportResultRenderParams } from '@/common/components/ImportPageCore/ImportResultDialog'
import type {
  DanmakuImportData,
  DanmakuImportResult,
} from '@/common/danmaku/dto'

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
          <Stack spacing={2}>
            <Alert severity="error">
              <AlertTitle>
                {t('importPage.parseError', 'Failed to parse file')}
              </AlertTitle>
              {error?.message}
            </Alert>
          </Stack>
        )
      }
      return (
        <Stack spacing={2}>
          {data && (
            <>
              <Alert severity="info">
                {t('importPage.willImport', { count: data.length })}
              </Alert>
              <Paper variant="outlined">
                <List dense>
                  {data.map((item, i) => (
                    <ListItem key={i}>
                      <ListItemIcon>
                        <InsertDriveFile />
                      </ListItemIcon>
                      <ListItemText primary={item.title} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </>
          )}
        </Stack>
      )
    }
    case 'uploadSuccess': {
      const customImports: { title: string }[] = []
      const seasonMap: Record<string, { title: string }[]> = {}
      let totalSkipped = 0
      let totalImportedCount = 0

      result.success.forEach((item) => {
        if (item.type === 'Custom') {
          customImports.push(item)
          totalImportedCount++
        } else {
          totalSkipped += item.result.skipped
          Object.entries(item.result.imported).forEach(
            ([seasonTitle, episodes]) => {
              if (!seasonMap[seasonTitle]) {
                seasonMap[seasonTitle] = []
              }
              seasonMap[seasonTitle].push(...episodes)
              totalImportedCount += episodes.length
            }
          )
        }
      })

      return (
        <Stack spacing={2}>
          {(totalImportedCount > 0 || totalSkipped > 0) && (
            <>
              <Alert severity="success">
                {t('importPage.importSuccess', {
                  count: totalImportedCount,
                })}
                {totalSkipped > 0 &&
                  ` (${t('importPage.skipped', 'Skpped {{count}} files', { count: totalSkipped })})`}
              </Alert>
              <Stack spacing={1}>
                {customImports.length > 0 && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography>
                        {t('danmaku.local', 'Local Danmaku')} (
                        {customImports.length})
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense disablePadding>
                        {customImports.map((item, i) => (
                          <ListItem key={i} disablePadding>
                            <ListItemText primary={item.title} />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                )}
                {Object.entries(seasonMap).map(([seasonTitle, episodes], i) => (
                  <Accordion key={i}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography>
                        {seasonTitle} ({episodes.length})
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense disablePadding>
                        {episodes.map((episode, k) => (
                          <ListItem key={k} disablePadding>
                            <ListItemText primary={episode.title} />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Stack>
            </>
          )}
          {result.error.length > 0 && (
            <>
              <Alert severity="error">
                {t('importPage.importError', { count: result.error.length })}
              </Alert>
              <Stack spacing={1}>
                {result.error.map((item, i) => (
                  <Alert key={i} severity="error" variant="outlined">
                    <AlertTitle>{item.title}</AlertTitle>
                    {item.message}
                  </Alert>
                ))}
              </Stack>
            </>
          )}
        </Stack>
      )
    }
    case 'error': {
      return (
        <Stack spacing={2}>
          <Alert severity="error">
            <AlertTitle>
              {t('error.unknown', 'Something went wrong.')}
            </AlertTitle>
            {importError?.message}
          </Alert>
        </Stack>
      )
    }
    default:
      return null
  }
}

import type { ConfigSchema } from '@mr-quin/dango'
import { Search } from '@mui/icons-material'
import {
  Button,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import type {
  ManifestTestEpisodeRow,
  ManifestTestSearchRow,
} from '@/common/rpcClient/background/types'
import { useManifestTestRun } from '../hooks/useManifestEditor'
import { SchemaObjectFields } from './forms/SchemaFields'
import { buildDefaultValues } from './forms/schemaForm'

interface ManifestTestRunPanelProps {
  manifest: unknown
  configSchema?: ConfigSchema
}

interface TestRunForm {
  config: Record<string, unknown>
}

export const ManifestTestRunPanel = ({
  manifest,
  configSchema,
}: ManifestTestRunPanelProps) => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()
  const { search, episodes, danmaku } = useManifestTestRun()

  const methods = useForm<TestRunForm>({
    defaultValues: { config: buildDefaultValues(configSchema, undefined) },
  })

  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<ManifestTestSearchRow[]>([])
  const [episodeRows, setEpisodeRows] = useState<ManifestTestEpisodeRow[]>([])
  const [commentCount, setCommentCount] = useState<number | null>(null)

  const configValues = () => methods.getValues('config')
  const onError = (error: Error) => toast.error(error.message)

  const handleSearch = () => {
    setResults([])
    setEpisodeRows([])
    setCommentCount(null)
    search.mutate({ manifest, keyword }, { onSuccess: setResults, onError })
  }

  const handlePickSeason = (row: ManifestTestSearchRow) => {
    setEpisodeRows([])
    setCommentCount(null)
    episodes.mutate(
      { manifest, configValues: configValues(), providerIds: row.providerIds },
      { onSuccess: setEpisodeRows, onError }
    )
  }

  const handlePickEpisode = (row: ManifestTestEpisodeRow) => {
    setCommentCount(null)
    danmaku.mutate(
      {
        manifest,
        configValues: configValues(),
        providerIds: row.providerIds,
        params: row.params,
      },
      { onSuccess: (res) => setCommentCount(res.commentCount), onError }
    )
  }

  return (
    <FormProvider {...methods}>
      <Stack direction="column" spacing={2}>
        <Typography variant="subtitle2">
          {t('providers.editor.testRun.title', 'Test run')}
        </Typography>
        {configSchema ? (
          <SchemaObjectFields schema={configSchema} path="config" />
        ) : null}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <TextField
            size="small"
            fullWidth
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t(
              'providers.editor.testRun.keyword',
              'Search keyword'
            )}
          />
          <Button
            variant="outlined"
            startIcon={
              search.isPending ? (
                <CircularProgress size={16} />
              ) : (
                <Search fontSize="small" />
              )
            }
            disabled={search.isPending || keyword.trim() === ''}
            onClick={handleSearch}
          >
            {t('providers.editor.testRun.search', 'Search')}
          </Button>
        </Stack>

        {results.length > 0 ? (
          <>
            <Divider />
            <Typography variant="caption" color="text.secondary">
              {t('providers.editor.testRun.results', 'Results (pick a season)')}
            </Typography>
            <List dense disablePadding>
              {results.map((row) => (
                <ListItemButton
                  key={row.indexedId}
                  onClick={() => handlePickSeason(row)}
                  disabled={episodes.isPending}
                >
                  <ListItemText primary={row.title} secondary={row.type} />
                </ListItemButton>
              ))}
            </List>
          </>
        ) : null}

        {episodeRows.length > 0 ? (
          <>
            <Divider />
            <Typography variant="caption" color="text.secondary">
              {t(
                'providers.editor.testRun.episodes',
                'Episodes (pick one for danmaku)'
              )}
            </Typography>
            <List dense disablePadding>
              {episodeRows.map((row) => (
                <ListItemButton
                  key={row.indexedId}
                  onClick={() => handlePickEpisode(row)}
                  disabled={danmaku.isPending}
                >
                  <ListItemText
                    primary={row.title}
                    secondary={
                      row.episodeNumber !== undefined
                        ? String(row.episodeNumber)
                        : undefined
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        ) : null}

        {commentCount !== null ? (
          <Typography variant="body2" color="success.main">
            {t(
              'providers.editor.testRun.danmakuCount',
              '{{count}} comments fetched',
              { count: commentCount }
            )}
          </Typography>
        ) : null}
      </Stack>
    </FormProvider>
  )
}

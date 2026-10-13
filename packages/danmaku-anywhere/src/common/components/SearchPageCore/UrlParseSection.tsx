import type { Episode, WithSeason } from '@danmaku-anywhere/danmaku-converter'
import { CheckCircle, Download, ErrorOutlined, Info } from '@mui/icons-material'
import {
  alpha,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'
import type { QueryKey } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { describeSourceError } from '@/common/providers/describeSourceError'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { getTrackingService } from '@/common/telemetry/getTrackingService'
import { isNetworkError } from '@/common/utils/networkError'

interface UrlParseSectionProps {
  url: string
  submitToken: number
  onImportSuccess?: (episode: WithSeason<Episode>) => void
  onSearchInstead?: () => void
}

export function UrlParseSection({
  url,
  submitToken,
  onImportSuccess,
  onSearchInstead,
}: UrlParseSectionProps) {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  const trimmedUrl = url.trim()

  const queryKey: QueryKey = [
    ...seasonQueryKeys.parseUrl(trimmedUrl),
    { submitToken },
  ]

  const query = useQuery({
    enabled: submitToken > 0 && !!trimmedUrl,
    queryKey,
    retry: false,
    queryFn: async () => {
      getTrackingService().track('parseUrl', { url: trimmedUrl })
      return chromeRpcClient.mediaParseUrl({ url: trimmedUrl })
    },
    select: (res) => res.data,
  })

  const fetchDanmaku = useFetchDanmaku()

  const handleFetchDanmaku = () => {
    if (!query.data) {
      return
    }
    fetchDanmaku.mutate(
      {
        type: 'by-meta',
        meta: query.data,
        options: { forceUpdate: true },
      },
      {
        onSuccess: ({ episode, keptStored }) => {
          if (!keptStored) {
            toast.success(
              t('searchPage.parse.alert.importSuccess', 'Import successful')
            )
          }
          onImportSuccess?.(episode)
        },
        onError: (error) => {
          toast.error(
            t(
              'danmaku.alert.fetchError',
              'Failed to fetch danmaku: {{message}}',
              { message: describeSourceError(error) }
            )
          )
        },
      }
    )
  }

  if (query.isFetching) {
    return (
      <Stack
        sx={{
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          minHeight: 80,
          py: 4,
        }}
      >
        <CircularProgress size={20} />
      </Stack>
    )
  }

  if (query.isError) {
    const reason = isNetworkError(query.error)
      ? t(
          'searchPage.parse.networkError',
          "Couldn't reach the site. Check your connection and try again."
        )
      : describeSourceError(query.error)
    return (
      <Box
        data-testid="parse-error"
        sx={(theme) => ({
          borderRadius: 1.5,
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
          padding: 1.5,
        })}
      >
        <Stack spacing={1}>
          <Stack
            direction="row"
            spacing={0.75}
            sx={{
              alignItems: 'center',
            }}
          >
            <ErrorOutlined sx={{ fontSize: 14, color: 'error.main' }} />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {t('searchPage.parse.failed', "Couldn't parse this URL")}
            </Typography>
          </Stack>
          {reason ? (
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}
            >
              {reason}
            </Typography>
          ) : null}
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => void query.refetch()}
            >
              {t('searchPage.retrySearch', 'Retry')}
            </Button>
            {onSearchInstead ? (
              <Button variant="text" size="small" onClick={onSearchInstead}>
                {t('searchPage.parse.searchInstead', 'Search by title instead')}
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Box>
    )
  }

  if (query.isSuccess && query.data) {
    return (
      <Box
        sx={(theme) => ({
          borderRadius: 1.5,
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
          padding: 1.5,
        })}
      >
        <Stack spacing={1.25}>
          <Stack
            direction="row"
            spacing={0.75}
            sx={{
              alignItems: 'center',
            }}
          >
            <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {t('searchPage.parse.parsed', 'Parsed')}
            </Typography>
          </Stack>
          <Box>
            <Typography
              variant="overline"
              sx={{
                color: 'text.secondary',
              }}
            >
              {t('anime.title', 'Title')}
            </Typography>
            <Typography variant="body2">{query.data.season.title}</Typography>
          </Box>
          <Box>
            <Typography
              variant="overline"
              sx={{
                color: 'text.secondary',
              }}
            >
              {t('anime.episodeTitle', 'Episode Title')}
            </Typography>
            <Typography variant="body2">{query.data.title}</Typography>
          </Box>
          <Button
            onClick={handleFetchDanmaku}
            loading={fetchDanmaku.isPending}
            variant="contained"
            startIcon={<Download sx={{ fontSize: 14 }} />}
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('searchPage.parse.import', 'Download Danmaku')}
          </Button>
        </Stack>
      </Box>
    )
  }

  return (
    <Box
      sx={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        padding: '6px 8px',
        borderRadius: 1,
        backgroundColor: alpha(theme.palette.info.main, 0.14),
        color: theme.palette.severityInk.info,
      })}
    >
      <Info sx={{ fontSize: 12 }} />
      <Typography variant="caption">
        {t(
          'searchPage.parse.urlDetected',
          'URL detected. Parsing instead of searching.'
        )}
      </Typography>
    </Box>
  )
}

interface NoUrlParserNoticeProps {
  onSearchInstead: () => void
}

export function NoUrlParserNotice({ onSearchInstead }: NoUrlParserNoticeProps) {
  const { t } = useTranslation()
  return (
    <Box
      data-testid="parse-no-source"
      sx={(theme) => ({
        borderRadius: 1.5,
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
        padding: 1.5,
      })}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <Info sx={{ fontSize: 14, color: 'info.main' }} />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {t('searchPage.parse.noSource', 'No source can read this link')}
          </Typography>
        </Stack>
        <Button
          variant="text"
          size="small"
          onClick={onSearchInstead}
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('searchPage.parse.searchInstead', 'Search by title instead')}
        </Button>
      </Stack>
    </Box>
  )
}

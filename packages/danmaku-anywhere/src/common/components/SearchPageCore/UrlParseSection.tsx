import type { Episode, WithSeason } from '@danmaku-anywhere/danmaku-converter'
import { CheckCircle, Download, Info } from '@mui/icons-material'
import { alpha, Box, Button, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import {
  DanmakuSourceType,
  localizedDanmakuSourceType,
} from '@/common/danmaku/enums'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { getTrackingService } from '@/common/telemetry/getTrackingService'

const PARSEABLE_HOSTS: Record<string, DanmakuSourceType> = {
  'www.bilibili.com': DanmakuSourceType.Bilibili,
  'v.qq.com': DanmakuSourceType.Tencent,
}

export function isParseableUrl(value: string): boolean {
  try {
    const url = new URL(value.trim())
    return url.hostname in PARSEABLE_HOSTS
  } catch {
    return false
  }
}

export function getUrlProviderLabel(value: string): string | undefined {
  try {
    const { hostname } = new URL(value.trim())
    const source = PARSEABLE_HOSTS[hostname]
    if (!source) {
      return undefined
    }
    return localizedDanmakuSourceType(source)
  } catch {
    return undefined
  }
}

interface UrlParseSectionProps {
  url: string
  submitToken: number
  onImportSuccess?: (episode: WithSeason<Episode>) => void
}

export function UrlParseSection({
  url,
  submitToken,
  onImportSuccess,
}: UrlParseSectionProps) {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  const trimmedUrl = url.trim()

  const query = useQuery({
    enabled: false,
    queryKey: seasonQueryKeys.parseUrl(trimmedUrl),
    retry: false,
    queryFn: async () => {
      getTrackingService().track('parseUrl', { url: trimmedUrl })
      return chromeRpcClient.mediaParseUrl({ url: trimmedUrl })
    },
    select: (res) => res.data,
  })

  const fetchDanmaku = useFetchDanmaku()

  useEffect(() => {
    if (submitToken === 0 || !trimmedUrl) {
      return
    }
    void query.refetch()
  }, [submitToken, trimmedUrl, query.refetch])

  useEffect(() => {
    if (query.error) {
      toast.error(t('searchPage.parse.alert.parseError', 'Parse failed'))
    }
  }, [query.error, t, toast])

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
        onSuccess: (data) => {
          toast.success(
            t('searchPage.parse.alert.importSuccess', 'Import successful')
          )
          onImportSuccess?.(data)
        },
        onError: () => {
          toast.error(
            t(
              'danmaku.alert.fetchError',
              'Failed to fetch danmaku: {{message}}',
              { message: query.data?.title ?? '' }
            )
          )
        },
      }
    )
  }

  if (query.isFetching) {
    return null
  }

  if (query.data) {
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
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {t('searchPage.parse.parsed', 'Parsed')}
            </Typography>
          </Stack>
          <Box>
            <Typography variant="overline" color="text.secondary">
              {t('anime.title', 'Title')}
            </Typography>
            <Typography variant="body2">{query.data.season.title}</Typography>
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary">
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
          'URL detected — parsing instead of searching.'
        )}
      </Typography>
    </Box>
  )
}

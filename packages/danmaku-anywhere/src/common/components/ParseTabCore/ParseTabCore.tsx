import type { Episode, WithSeason } from '@danmaku-anywhere/danmaku-converter'
import {
  Box,
  Button,
  Divider,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import {
  DanmakuSourceType,
  localizedDanmakuSourceType,
} from '@/common/danmaku/enums'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { getTrackingService } from '@/common/hooks/tracking/useSetupTracking'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

const validateUrl = (value: string) => {
  try {
    const url = new URL(value)
    return ['www.bilibili.com', 'v.qq.com'].includes(url.hostname)
  } catch {
    return false
  }
}

const getUrlType = (url: string) => {
  try {
    const { hostname } = new URL(url)

    if (hostname === 'www.bilibili.com') {
      return localizedDanmakuSourceType(DanmakuSourceType.Bilibili)
    }
    if (hostname === 'v.qq.com') {
      return localizedDanmakuSourceType(DanmakuSourceType.Tencent)
    }
    return ''
  } catch {
    return ''
  }
}

interface ParseUrlForm {
  url: string
}

interface ParseTabCoreProps {
  onImportSuccess?: (episode: WithSeason<Episode>) => void
}

export const ParseTabCore = ({ onImportSuccess }: ParseTabCoreProps) => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  const {
    register,
    watch,
    getValues,
    formState: { errors, isValid },
  } = useForm<ParseUrlForm>({
    values: {
      url: '',
    },
    defaultValues: {
      url: '',
    },
    mode: 'onChange',
  })

  const urlType = getUrlType(watch('url'))

  const query = useQuery({
    enabled: false,
    queryKey: seasonQueryKeys.parseUrl(getValues().url),
    retry: false,
    queryFn: async () => {
      getTrackingService().track('parseUrl', {
        url: getValues().url,
      })
      return chromeRpcClient.mediaParseUrl({ url: getValues().url })
    },
    select: (res) => res.data,
  })

  const mutation = useFetchDanmaku()

  const handleFetchDanmaku = () => {
    if (!query.data) return

    mutation.mutate(
      {
        meta: query.data,
        options: {
          forceUpdate: true,
        },
      },
      {
        onSuccess: (data) => {
          toast.success(t('searchPage.parse.alert.importSuccess'))
          onImportSuccess?.(data)
        },
        onError: () => {
          toast.error(
            t('danmaku.alert.fetchError', {
              message: query.data.title,
            })
          )
        },
      }
    )
  }

  useEffect(() => {
    if (query.error) {
      const errorMessage = t('searchPage.parse.alert.parseError')
      toast.error(errorMessage)
    }
  }, [query.error])

  return (
    <Box>
      <Box
        p={2}
        component="form"
        onSubmit={(e) => {
          e.preventDefault()
          void query.refetch()
        }}
      >
        <Stack spacing={2}>
          <TextField
            {...register('url', {
              required: true,
              validate: (value) => {
                if (!validateUrl(value)) {
                  return t('searchPage.parse.error.invalidUrl')
                }
              },
            })}
            label={t('searchPage.parse.videoUrl')}
            error={!!errors.url}
            helperText={
              errors.url?.message || t('searchPage.parse.tooltip.videoUrl')
            }
            fullWidth
            required
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">{t(urlType)}</InputAdornment>
                ),
              },
            }}
          />

          <Button
            type="submit"
            loading={query.isLoading}
            variant="contained"
            disabled={!isValid || mutation.isPending}
          >
            {t('searchPage.parse.parse')}
          </Button>
        </Stack>
      </Box>
      {query.data && (
        <>
          <Divider />
          <Box p={2}>
            <Typography variant="h2" fontSize={18} gutterBottom>
              {t('searchPage.parse.parseResult')}
            </Typography>
            <Typography variant="caption" gutterBottom>
              {t('anime.title')}
            </Typography>
            <Typography gutterBottom>{query.data.season.title}</Typography>
            <Typography variant="caption" gutterBottom>
              {t('anime.episodeTitle')}
            </Typography>
            <Typography>{query.data.title}</Typography>
            <Button
              sx={{
                mt: 2,
              }}
              onClick={handleFetchDanmaku}
              loading={mutation.isPending}
              variant="contained"
            >
              {t('searchPage.parse.import')}
            </Button>
          </Box>
        </>
      )}
    </Box>
  )
}

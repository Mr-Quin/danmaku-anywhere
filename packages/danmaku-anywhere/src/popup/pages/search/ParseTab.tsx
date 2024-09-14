import { LoadingButton } from '@mui/lab'
import {
  Box,
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

import { mediaKeys } from '@/common/anime/queries/mediaQueryKeys'
import { useToast } from '@/common/components/Toast/toastStore'
import type { DanmakuFetchDto } from '@/common/danmaku/dto'
import {
  DanmakuSourceType,
  localizedDanmakuSourceType,
} from '@/common/danmaku/enums'
import type { DanmakuMeta } from '@/common/danmaku/models/meta'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
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

const normalizeMetaName = (
  meta: DanmakuMeta
): {
  seasonTitle: string
  episodeTitle: string
} => {
  switch (meta.provider) {
    case DanmakuSourceType.Bilibili:
      return {
        seasonTitle: meta.seasonTitle,
        episodeTitle: meta.title,
      }
    case DanmakuSourceType.Tencent:
      return {
        seasonTitle: meta.seasonTitle,
        episodeTitle: meta.episodeTitle,
      }
    case DanmakuSourceType.DanDanPlay:
      return {
        seasonTitle: meta.animeTitle,
        episodeTitle: meta.episodeTitle,
      }
    default:
      break
  }

  // should not be reachable
  return {
    seasonTitle: '',
    episodeTitle: '',
  }
}

export const ParseTab = () => {
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
    queryKey: mediaKeys.parseUrl(getValues().url),
    retry: false,
    queryFn: async () => {
      return chromeRpcClient.mediaParseUrl({ url: getValues().url })
    },
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
      } as DanmakuFetchDto,
      {
        onSuccess: () => {
          toast.success(t('searchPage.parse.importSuccess'))
        },
        onError: (_, v) => {
          v.meta
          toast.error(
            t('danmaku.alert.fetchError', {
              message: normalizeMetaName(query.data).episodeTitle,
            })
          )
        },
      }
    )
  }

  useEffect(() => {
    if (query.error) {
      toast.error(t('searchPage.parse.alert.parseError'))
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
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">{t(urlType)}</InputAdornment>
              ),
            }}
          />

          <LoadingButton
            type="submit"
            loading={query.isLoading}
            variant="contained"
            disabled={!isValid || mutation.isPending}
          >
            {t('searchPage.parse.parse')}
          </LoadingButton>
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
              {t('searchPage.parse.seasonTitle')}
            </Typography>
            <Typography gutterBottom>
              {normalizeMetaName(query.data).seasonTitle}
            </Typography>
            <Typography variant="caption" gutterBottom>
              {t('searchPage.parse.episodeTitle')}
            </Typography>
            <Typography>
              {normalizeMetaName(query.data).episodeTitle}
            </Typography>
            <LoadingButton
              sx={{
                mt: 2,
              }}
              onClick={handleFetchDanmaku}
              loading={mutation.isPending}
              variant="contained"
            >
              {t('searchPage.parse.import')}
            </LoadingButton>
          </Box>
        </>
      )}
    </Box>
  )
}
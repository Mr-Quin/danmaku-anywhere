import {
  CoverImage,
  CoverImageSkeleton,
} from '@/common/components/MediaList/components/CoverImage'
import type { HandleSeasonClick } from '@/common/components/MediaList/types'
import { ProviderLogo } from '@/common/components/ProviderLogo'
import { useToast } from '@/common/components/Toast/toastStore'
import { isProvider } from '@/common/danmaku/utils'
import { episodeQueryKeys, seasonQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { DrilldownMenu } from '@/content/common/DrilldownMenu'
import {
  type CustomSeason,
  DanmakuSourceType,
  type Season,
} from '@danmaku-anywhere/danmaku-converter'
import { Delete, Refresh } from '@mui/icons-material'
import {
  type CSSProperties,
  Card,
  CardActionArea,
  CardContent,
  Link,
  Skeleton,
  Tooltip,
  Typography,
  alpha,
  styled,
} from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

interface CardCornerInfoProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

const CardCornerInfo = styled('div', {
  shouldForwardProp: (prop) => prop !== 'position',
})<CardCornerInfoProps>(({ theme, position = 'top-left' }) => {
  const styles: CSSProperties = {
    position: 'absolute',
    backgroundColor: alpha(theme.palette.background.paper, 0.8),
    padding: theme.spacing(1),
    color: theme.palette.text.primary,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
  }

  switch (position) {
    case 'top-right':
      styles.top = 0
      styles.right = 0
      styles.borderBottomLeftRadius = theme.shape.borderRadius
      break
    case 'bottom-left':
      styles.bottom = 0
      styles.left = 0
      styles.borderTopRightRadius = theme.shape.borderRadius
      break
    case 'bottom-right':
      styles.bottom = 0
      styles.right = 0
      styles.borderTopLeftRadius = theme.shape.borderRadius
      break
    case 'top-left':
    default:
      styles.top = 0
      styles.left = 0
      styles.borderBottomRightRadius = theme.shape.borderRadius
      break
  }

  return styles
})

const Logo = styled('div')(({ theme }) => {
  return {
    position: 'absolute',
    backgroundColor: alpha(theme.palette.background.paper, 0.8),
    top: 0,
    left: 0,
    width: 24,
    height: 24,
  }
})

type SeasonCardProps = {
  season: Season | CustomSeason
  onClick: HandleSeasonClick
  disableMenu?: boolean
  disableSelection?: boolean
}

export const SeasonCard = ({
  season,
  onClick,
  disableMenu = false,
}: SeasonCardProps) => {
  const { t } = useTranslation()
  const { toast } = useToast()

  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationKey: seasonQueryKeys.all(),
    mutationFn: (id: number) => chromeRpcClient.seasonDelete({ id }),
    onSuccess: () => {
      toast.success(t('common.success'))
      void queryClient.invalidateQueries({
        queryKey: episodeQueryKeys.all(),
      })
    },
    onError: () => {
      toast.error(t('common.failed'))
    },
  })

  const refreshMutation = useMutation({
    mutationKey: seasonQueryKeys.all(),
    mutationFn: (id: number) => chromeRpcClient.seasonRefresh({ id }),
    onSuccess: () => {
      toast.success(t('common.success'))
    },
    onError: () => {
      toast.error(t('common.failed'))
    },
  })

  const renderEpisodeCount = () => {
    if (season.localEpisodeCount) {
      const totalEpisodes = season.episodeCount?.toString() ?? '?'
      return (
        <CardCornerInfo position="top-right">
          {`${season.localEpisodeCount} / ${totalEpisodes}`}
        </CardCornerInfo>
      )
    } else if (season.episodeCount) {
      return (
        <CardCornerInfo position="top-right">
          {season.episodeCount}
        </CardCornerInfo>
      )
    }
    return null
  }

  return (
    <Card>
      <div
        style={{
          position: 'relative',
        }}
      >
        <CardActionArea onClick={() => onClick(season)}>
          <CoverImage src={season.imageUrl} alt={season.title}></CoverImage>
        </CardActionArea>
        {renderEpisodeCount()}
        {season.year && (
          <CardCornerInfo position="bottom-left">{season.year}</CardCornerInfo>
        )}
        {!isProvider(season, DanmakuSourceType.Custom) && (
          <Logo>
            <ProviderLogo provider={season.provider} />
          </Logo>
        )}
        {!isProvider(season, DanmakuSourceType.Custom) && !disableMenu && (
          <CardCornerInfo position="bottom-right" sx={{ p: 0 }}>
            <DrilldownMenu
              ButtonProps={{
                size: 'small',
              }}
              items={[
                {
                  id: 'refresh',
                  label: t('anime.refresh'),
                  icon: <Refresh />,
                  onClick: () => {
                    refreshMutation.mutate(season.id)
                  },
                },
                {
                  id: 'delete',
                  label: t('common.delete'),
                  icon: <Delete />,
                  loading: deleteMutation.isPending,
                  onClick: () => {
                    deleteMutation.mutate(season.id)
                  },
                },
              ]}
            />
          </CardCornerInfo>
        )}
      </div>
      <CardContent sx={{ py: 1.5, px: 1 }}>
        <Tooltip title={season.title} enterDelay={500} placement="top">
          <Link
            color="inherit"
            variant="subtitle2"
            underline="hover"
            display="block"
            noWrap
            sx={{
              cursor: 'pointer',
            }}
            onClick={() => {
              onClick(season)
            }}
          >
            {season.title}
          </Link>
        </Tooltip>
      </CardContent>
    </Card>
  )
}

export const SeasonCardSkeleton = () => {
  return (
    <Card>
      <CoverImageSkeleton />
      <CardContent sx={{ py: 1.5, px: 1 }}>
        <Typography component="div">
          <Skeleton />
        </Typography>
      </CardContent>
    </Card>
  )
}

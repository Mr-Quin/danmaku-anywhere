import {
  type CustomSeason,
  DanmakuSourceType,
  type Season,
} from '@danmaku-anywhere/danmaku-converter'
import { Delete, FileDownload, Refresh } from '@mui/icons-material'
import {
  alpha,
  Card,
  CardActionArea,
  CardContent,
  Checkbox,
  type CSSProperties,
  Link,
  Skeleton,
  styled,
  Tooltip,
  Typography,
} from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
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
import { useExportXml } from '@/popup/hooks/useExportXml'
import { useExportDanmaku } from '@/popup/hooks/useExportDanmaku'
import { useDeleteEpisode } from '@/common/danmaku/queries/useDeleteEpisode'

interface CardCornerInfoProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

const CardCornerInfo = styled('div', {
  shouldForwardProp: (prop) => prop !== 'position',
})<CardCornerInfoProps>(({ theme, position = 'top-left' }) => {
  const styles: CSSProperties = {
    ...theme.typography.subtitle2,
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
  onClick?: HandleSeasonClick
  disableMenu?: boolean
  enableSelection?: boolean
  isSelected?: boolean
  onSelect?: (season: Season | CustomSeason, selected: boolean) => void
}

const SelectionOverlay = styled('div')(() => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: alpha('#000', 0.4),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1,
}))

export const SeasonCard = ({
                             season,
                             onClick,
                             disableMenu = false,
                             enableSelection = false,
                             isSelected = false,
                             onSelect,
                           }: SeasonCardProps) => {
  const { t } = useTranslation()
  const { toast } = useToast()

  const queryClient = useQueryClient()

  const exportXml = useExportXml()
  const exportDanmaku = useExportDanmaku()

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
    }
    if (season.episodeCount) {
      return (
        <CardCornerInfo position="top-right">
          {season.episodeCount}
        </CardCornerInfo>
      )
    }
    return null
  }

  const handleCardClick = (e: MouseEvent) => {
    if (enableSelection && onSelect) {
      e.preventDefault()
      onSelect(season, !isSelected)
    } else if (onClick) {
      onClick(season)
    }
  }

  const renderMenu = () => {
    if (disableMenu || enableSelection) {
      return null
    }
    if (isProvider(season, DanmakuSourceType.Custom)) {
      return <CardCornerInfo position="bottom-right" sx={{ p: 0 }}>
        <DrilldownMenu
          ButtonProps={{
            size: 'small',
          }}
          items={[
            {
              id: 'export',
              label: t('danmaku.backup'),
              icon: <FileDownload />,
              onClick: () => {
                exportDanmaku.mutate(
                  {
                    filter: {
                      seasonId: season.id,
                    },
                  },
                )
              },
              loading: exportDanmaku.isPending,
            },
            {
              id: 'exportXml',
              label: t('danmaku.exportXml'),
              icon: <FileDownload />,
              onClick: () => {
                exportXml.mutate({
                  filter: {
                    seasonId: season.id,
                  },
                })
              },
              loading: exportXml.isPending,
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
    }
    return <CardCornerInfo position="bottom-right" sx={{ p: 0 }}>
      <DrilldownMenu
        ButtonProps={{
          size: 'small',
        }}
        items={[
          {
            id: 'refresh',
            label: t('anime.refreshMetadata'),
            icon: <Refresh />,
            onClick: () => {
              refreshMutation.mutate(season.id)
            },
            loading: refreshMutation.isPending,
          },
          {
            id: 'export',
            label: t('danmaku.backup'),
            icon: <FileDownload />,
            onClick: () => {
              exportDanmaku.mutate(
                {
                  filter: {
                    seasonId: season.id,
                  },
                },
              )
            },
            loading: exportDanmaku.isPending,
          },
          {
            id: 'exportXml',
            label: t('danmaku.exportXml'),
            icon: <FileDownload />,
            onClick: () => {
              exportXml.mutate({
                filter: {
                  seasonId: season.id,
                },
              })
            },
            loading: exportXml.isPending,
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
  }

  return (
    <Card>
      <div
        style={{
          position: 'relative',
        }}
      >
        <CardActionArea onClick={handleCardClick}>
          <CoverImage src={season.imageUrl} alt={season.title} />
          {enableSelection && (
            <SelectionOverlay>
              <Checkbox
                checked={isSelected}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onSelect?.(season, e.target.checked)}
                sx={{
                  color: 'white',
                  '&.Mui-checked': {
                    color: 'white',
                  },
                  position: 'absolute',
                  top: 0,
                  left: 0,
                }}
              />
            </SelectionOverlay>
          )}
          {refreshMutation.isPending && (
            <SelectionOverlay>
              <FullPageSpinner />
            </SelectionOverlay>
          )}
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
        {!isProvider(season, DanmakuSourceType.Custom) &&
          !disableMenu &&
          !enableSelection && (
            <CardCornerInfo position="bottom-right" sx={{ p: 0 }}>
              <DrilldownMenu
                ButtonProps={{
                  size: 'small',
                }}
                items={[
                  {
                    id: 'refresh',
                    label: t('anime.refreshMetadata'),
                    icon: <Refresh />,
                    onClick: () => {
                      refreshMutation.mutate(season.id)
                    },
                    loading: refreshMutation.isPending,
                  },
                  {
                    id: 'export',
                    label: t('danmaku.backup'),
                    icon: <FileDownload />,
                    onClick: () => {
                      exportDanmaku.mutate(
                        {
                          filter: {
                            seasonId: season.id,
                          },
                        },
                      )
                    },
                    loading: exportDanmaku.isPending,
                  },
                  {
                    id: 'exportXml',
                    label: t('danmaku.exportXml'),
                    icon: <FileDownload />,
                    onClick: () => {
                      exportXml.mutate({
                        filter: {
                          seasonId: season.id,
                        },
                      })
                    },
                    loading: exportXml.isPending,
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
            onClick={(e) => handleCardClick(e)}
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

import type {
  CustomEpisodeLite,
  EpisodeLite,
  EpisodeMeta,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { Check, Download } from '@mui/icons-material'
import {
  Box,
  ButtonBase,
  CircularProgress,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useImage } from '@/common/components/image/useImage'
import { isNotCustom } from '@/common/danmaku/utils'

const isEpisodeLite = (
  episode: WithSeason<EpisodeMeta> | CustomEpisodeLite
): episode is WithSeason<EpisodeLite> => {
  return 'id' in episode
}

const THUMB_SIZE = 24

function EpisodeThumb({ src }: { src?: string }) {
  const image = useImage(src ?? '')

  if (!src) {
    return null
  }

  if (image.isPending) {
    return (
      <Skeleton
        variant="rounded"
        width={THUMB_SIZE}
        height={THUMB_SIZE}
        sx={{ flexShrink: 0 }}
      />
    )
  }

  if (!image.data) {
    return null
  }

  return (
    <Box
      component="img"
      src={image.data}
      alt=""
      sx={{
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: 0.5,
        objectFit: 'cover',
        flexShrink: 0,
      }}
    />
  )
}

function deriveEpisodeNumber(
  episode: WithSeason<EpisodeMeta> | CustomEpisodeLite,
  index?: number
): string {
  if (isNotCustom(episode) && episode.episodeNumber !== undefined) {
    return String(episode.episodeNumber)
  }
  if (typeof index === 'number') {
    return String(index + 1)
  }
  return ''
}

type BaseEpisodeListItemProps<
  T extends WithSeason<EpisodeMeta> | CustomEpisodeLite,
> = {
  showImage?: boolean
  isLoading?: boolean
  onClick: (meta: T) => void
  episode: T
  index?: number
  disabled?: boolean
}

export function BaseEpisodeListItem<
  T extends WithSeason<EpisodeMeta> | CustomEpisodeLite,
>({
  showImage = true,
  isLoading,
  onClick,
  episode,
  index,
  disabled,
}: BaseEpisodeListItemProps<T>) {
  const { t } = useTranslation()

  const isLite = isEpisodeLite(episode)
  const isCustom = !isNotCustom(episode)
  const downloaded = isLite

  const number = deriveEpisodeNumber(episode, index)

  const testIdSuffix = isNotCustom(episode)
    ? episode.indexedId
    : (episode as CustomEpisodeLite).id
  const testId = `episode-list-item-${episode.provider}-${testIdSuffix}`

  const thumbSrc = !isCustom
    ? (episode as WithSeason<EpisodeMeta>).imageUrl
    : undefined

  const statusIcon = isLoading ? (
    <CircularProgress
      size={12}
      thickness={6}
      sx={{ color: 'text.secondary' }}
    />
  ) : downloaded ? (
    <Check sx={{ fontSize: 12, color: 'success.main' }} />
  ) : (
    <Download sx={{ fontSize: 12, color: 'text.secondary' }} />
  )

  return (
    <ButtonBase
      onClick={() => onClick(episode)}
      disabled={isLoading || disabled}
      data-testid={testId}
      sx={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        padding: '3px 6px',
        borderRadius: 0.75,
        textAlign: 'left',
        '&:hover': { bgcolor: 'action.hover' },
        '&.Mui-focusVisible': { bgcolor: 'action.hover' },
        '&.Mui-disabled': { opacity: 0.7 },
      }}
    >
      <Typography
        component="span"
        sx={{
          width: 18,
          flexShrink: 0,
          textAlign: 'right',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.2,
          color: 'text.secondary',
          lineHeight: 1,
        }}
      >
        {number}
      </Typography>
      {showImage && !isCustom && <EpisodeThumb src={thumbSrc} />}
      <Tooltip
        title={episode.title}
        enterDelay={1000}
        enterNextDelay={1000}
        placement="top"
      >
        <Stack sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {episode.title}
          </Typography>
          {isLite && (
            <Typography variant="caption" color="text.secondary">
              {t('danmaku.commentCounted', {
                count: (episode as WithSeason<EpisodeLite>).commentCount,
              })}
            </Typography>
          )}
        </Stack>
      </Tooltip>
      {statusIcon}
    </ButtonBase>
  )
}

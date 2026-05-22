import type {
  CustomSeason,
  Season,
  SeasonInsert,
} from '@danmaku-anywhere/danmaku-converter'
import { Check } from '@mui/icons-material'
import { Box, ButtonBase, Skeleton, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { isPersistedSeason } from '@/common/anime/utils'
import { useImage } from '@/common/components/image/useImage'
import { IMAGE_ASSETS } from '@/images/ImageAssets'

type SeasonOrInsert = Season | SeasonInsert | CustomSeason

interface SeasonResultRowProps {
  season: SeasonOrInsert
  onClick: (season: SeasonOrInsert) => void
}

const THUMB_SX = {
  width: 36,
  height: 50,
  flexShrink: 0,
  borderRadius: 0.75,
} as const

function PosterThumb({ src, alt }: { src?: string; alt?: string }) {
  const image = useImage(src || IMAGE_ASSETS.Fallback)

  if (image.isPending || !image.data) {
    return <Skeleton variant="rounded" sx={THUMB_SX} />
  }

  return (
    <Box
      component="img"
      src={image.data}
      alt={alt}
      sx={{ ...THUMB_SX, objectFit: 'cover' }}
    />
  )
}

export function SeasonResultRow({ season, onClick }: SeasonResultRowProps) {
  const { t } = useTranslation()

  const downloaded =
    season.localEpisodeCount !== undefined && season.localEpisodeCount > 0
  const testId = `season-card-${season.provider}-${
    isPersistedSeason(season) ? season.id : season.indexedId
  }`

  const metaParts: string[] = []
  if (season.year) {
    metaParts.push(String(season.year))
  }
  if (season.episodeCount) {
    metaParts.push(
      t('searchPage.epsCount', '{{count}} eps', {
        count: season.episodeCount,
      })
    )
  }

  return (
    <ButtonBase
      onClick={() => onClick(season)}
      data-testid={testId}
      sx={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        padding: '7px 10px',
        borderRadius: 1,
        textAlign: 'left',
        cursor: 'pointer',
        '&:hover': { bgcolor: 'action.hover' },
        '&.Mui-focusVisible': { bgcolor: 'action.hover' },
      }}
    >
      <PosterThumb src={season.imageUrl} alt={season.title} />
      <Stack
        data-testid="season-card-action"
        sx={{ flex: 1, minWidth: 0 }}
        spacing={0.25}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {season.title}
        </Typography>
        {metaParts.length > 0 && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
            }}
          >
            {metaParts.join(' · ')}
          </Typography>
        )}
      </Stack>
      {downloaded && (
        <Check sx={{ fontSize: 14, color: 'success.main', flexShrink: 0 }} />
      )}
    </ButtonBase>
  )
}

export function SeasonResultRowSkeleton() {
  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        padding: '7px 10px',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      <Skeleton variant="rounded" sx={THUMB_SX} />
      <Stack sx={{ flex: 1, minWidth: 0 }} spacing={0.5}>
        <Skeleton variant="text" width="62%" height={16} />
        <Skeleton variant="text" width="40%" height={12} />
      </Stack>
    </Box>
  )
}

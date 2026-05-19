import type {
  CustomSeason,
  Season,
  SeasonInsert,
} from '@danmaku-anywhere/danmaku-converter'
import { Check, PlayArrow } from '@mui/icons-material'
import { alpha, Box, ButtonBase, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { isPersistedSeason } from '@/common/anime/utils'
import { useImage } from '@/common/components/image/useImage'

type SeasonOrInsert = Season | SeasonInsert | CustomSeason

interface SeasonResultRowProps {
  season: SeasonOrInsert
  onClick: (season: SeasonOrInsert) => void
}

function PosterThumb({ src, alt }: { src?: string; alt?: string }) {
  const { data } = useImage(src ?? '')

  if (src && data) {
    return (
      <Box
        component="img"
        src={data}
        alt={alt}
        sx={{
          width: 36,
          height: 50,
          flexShrink: 0,
          borderRadius: 0.75,
          objectFit: 'cover',
        }}
      />
    )
  }

  return (
    <Box
      sx={(theme) => ({
        width: 36,
        height: 50,
        flexShrink: 0,
        borderRadius: 0.75,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: theme.palette.text.secondary,
        background: `linear-gradient(135deg, ${alpha(
          theme.palette.primary.main,
          0.28
        )}, ${alpha(theme.palette.secondary.main, 0.22)})`,
      })}
    >
      <PlayArrow sx={{ fontSize: 14 }} />
    </Box>
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
  if (season.type) {
    metaParts.push(season.type)
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
          <Typography variant="caption" color="text.secondary">
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

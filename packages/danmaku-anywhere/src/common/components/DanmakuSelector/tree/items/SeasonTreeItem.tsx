import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import { Favorite, Folder } from '@mui/icons-material'
import {
  Chip,
  Skeleton,
  Stack,
  styled,
  Tooltip,
  Typography,
} from '@mui/material'
import { type ReactElement, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { isCustomSeason } from '@/common/danmaku/utils'
import { SuspenseImage } from '../../../image/SuspenseImage'

const ProviderChip = styled(Chip)(({ theme }) => {
  return {
    fontSize: theme.typography.pxToRem(12),
  }
})

const SeasonThumbnail = ({
  imageUrl,
  title,
}: {
  imageUrl?: string
  title: string
}) => {
  if (!imageUrl) {
    return null
  }
  return (
    <Suspense fallback={<Skeleton width={32} height={32} variant="rounded" />}>
      <SuspenseImage
        src={imageUrl}
        alt={title}
        width={32}
        height={32}
        style={{
          objectFit: 'cover',
          borderRadius: 1,
        }}
      />
    </Suspense>
  )
}

interface SeasonTreeItemProps {
  season: Season | CustomSeason
  providerName?: string
  orphaned?: boolean
  fetchedCount?: number
  stubCount?: number
  bookmarked?: boolean
}

export const SeasonTreeItem = ({
  season,
  providerName,
  orphaned,
  fetchedCount,
  stubCount,
  bookmarked,
}: SeasonTreeItemProps): ReactElement => {
  const { t } = useTranslation()
  const isCustom = isCustomSeason(season)

  const renderCounts = () => {
    const fetched = fetchedCount ?? 0
    const stubs = stubCount ?? 0

    if (fetched === 0 && stubs === 0) {
      return null
    }

    const total = fetched + stubs
    const label =
      stubs > 0
        ? t(
            'mountPage.episodeCount.downloadedOfTotal',
            '{{fetched}} of {{count}} episodes downloaded',
            { fetched, count: total }
          )
        : t(
            'mountPage.episodeCount.downloaded',
            '{{count}} episodes downloaded',
            {
              count: fetched,
            }
          )

    return (
      <Tooltip title={label}>
        <Typography
          variant="caption"
          component="span"
          aria-label={label}
          data-testid="season-episode-count"
          sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}
        >
          {stubs > 0 ? `${fetched}/${total}` : fetched}
        </Typography>
      </Tooltip>
    )
  }

  return (
    <>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          overflow: 'hidden',
          pr: 1,
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          {isCustom ? (
            <Folder fontSize="small" />
          ) : (
            <SeasonThumbnail imageUrl={season.imageUrl} title={season.title} />
          )}
          <Typography noWrap variant="body2">
            {season.title}
          </Typography>
          {providerName && (
            <ProviderChip
              label={providerName}
              size="small"
              variant="outlined"
            />
          )}
          {orphaned && (
            <ProviderChip
              label={t('anime.sourceRemoved', 'Source removed')}
              size="small"
              variant="outlined"
              color="warning"
              data-testid="season-orphaned-badge"
            />
          )}
          {renderCounts()}
        </Stack>
        {bookmarked && (
          <Favorite fontSize="small" color="primary" sx={{ flexShrink: 0 }} />
        )}
      </Stack>
    </>
  )
}

import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import { Bookmark, Folder } from '@mui/icons-material'
import { Chip, Skeleton, Stack, styled, Typography } from '@mui/material'
import { type ReactElement, Suspense } from 'react'
import { localizedDanmakuSourceType } from '@/common/danmaku/enums'
import { isNotCustom } from '@/common/danmaku/utils'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
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
  provider?: ProviderConfig
  fetchedCount?: number
  stubCount?: number
  bookmarked?: boolean
}

export const SeasonTreeItem = ({
  season,
  provider,
  fetchedCount,
  stubCount,
  bookmarked,
}: SeasonTreeItemProps): ReactElement => {
  const isCustom = !isNotCustom(season)

  const renderCounts = () => {
    const hasFetched = fetchedCount !== undefined && fetchedCount > 0
    const hasStubs = stubCount !== undefined && stubCount > 0

    if (!hasFetched && !hasStubs) {
      return null
    }

    return (
      <Typography
        variant="caption"
        component="span"
        sx={{ whiteSpace: 'nowrap' }}
      >
        {hasFetched && (
          <Typography variant="caption" component="span" color="text.secondary">
            ({fetchedCount})
          </Typography>
        )}
        {hasStubs && (
          <Typography variant="caption" component="span" color="text.disabled">
            {` +${stubCount}`}
          </Typography>
        )}
      </Typography>
    )
  }

  return (
    <>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="space-between"
        width="100%"
        overflow="hidden"
        pr={1}
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          overflow="hidden"
        >
          {isCustom ? (
            <Folder fontSize="small" />
          ) : (
            <SeasonThumbnail imageUrl={season.imageUrl} title={season.title} />
          )}
          <Typography noWrap variant="body2">
            {season.title}
          </Typography>
          {provider && (
            <ProviderChip
              label={
                provider.isBuiltIn
                  ? localizedDanmakuSourceType(provider.impl)
                  : provider.name
              }
              size="small"
              variant="outlined"
              color={provider.isBuiltIn ? 'primary' : 'default'}
            />
          )}
          {renderCounts()}
        </Stack>
        {bookmarked && (
          <Bookmark fontSize="small" color="action" sx={{ flexShrink: 0 }} />
        )}
      </Stack>
    </>
  )
}

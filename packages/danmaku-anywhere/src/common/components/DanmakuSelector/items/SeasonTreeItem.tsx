import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import { Folder } from '@mui/icons-material'
import { Chip, Skeleton, Stack, styled, Typography } from '@mui/material'
import { type ReactElement, Suspense } from 'react'
import { isNotCustom } from '@/common/danmaku/utils'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { SuspenseImage } from '../../image/SuspenseImage'

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
  childrenCount?: number
}

export const SeasonTreeItem = ({
  season,
  provider,
  childrenCount,
}: SeasonTreeItemProps): ReactElement => {
  const isCustom = !isNotCustom(season)

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
              label={provider.name}
              size="small"
              variant="outlined"
              color={provider.isBuiltIn ? 'primary' : 'default'}
            />
          )}
          {childrenCount !== undefined && (
            <Typography variant="caption" color="text.secondary">
              ({childrenCount})
            </Typography>
          )}
        </Stack>
      </Stack>
    </>
  )
}

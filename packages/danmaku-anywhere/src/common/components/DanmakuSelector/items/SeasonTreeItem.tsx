import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import { Chip, Skeleton, Stack, styled, Typography } from '@mui/material'
import { type ReactElement, Suspense } from 'react'
import { isNotCustom } from '@/common/danmaku/utils'
import { useProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
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
  count?: number
}

export const SeasonTreeItem = ({
  season,
  count,
}: SeasonTreeItemProps): ReactElement => {
  const { getProviderById } = useProviderConfig()

  const provider = isNotCustom(season)
    ? getProviderById(season.providerConfigId)
    : undefined

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
          <SeasonThumbnail imageUrl={season.imageUrl} title={season.title} />
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
          {count !== undefined && (
            <Typography variant="caption" color="text.secondary">
              ({count})
            </Typography>
          )}
        </Stack>
      </Stack>
    </>
  )
}

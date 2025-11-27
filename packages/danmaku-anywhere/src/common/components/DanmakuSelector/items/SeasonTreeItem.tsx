import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import { Box, Stack, Typography } from '@mui/material'
import type { ReactElement } from 'react'
import { isNotCustom } from '@/common/danmaku/utils'
import { useProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { useExportDanmaku } from '@/popup/hooks/useExportDanmaku'
import { useDanmakuTreeContext } from '../DanmakuTreeContext'
import { SeasonContextMenu } from '../menus/SeasonContextMenu'

interface SeasonTreeItemProps {
  season: Season | CustomSeason
  count?: number
}

export const SeasonTreeItem = ({
  season,
  count,
}: SeasonTreeItemProps): ReactElement => {
  const { getProviderById } = useProviderConfig()

  const exportDanmaku = useExportDanmaku()
  const { setDeletingDanmaku } = useDanmakuTreeContext()

  const provider = isNotCustom(season)
    ? getProviderById(season.providerConfigId)
    : undefined

  const handleExport = () => {
    if (isNotCustom(season)) {
      exportDanmaku.mutate({
        filter: { id: season.id },
      })
    } else {
      exportDanmaku.mutate({
        customFilter: { id: season.id },
      })
    }
  }

  const handleDelete = () => {
    setDeletingDanmaku({ kind: 'season', season })
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
          {season.imageUrl && (
            <Box
              component="img"
              src={season.imageUrl}
              alt={season.title}
              sx={{
                width: 32,
                height: 32,
                objectFit: 'cover',
                borderRadius: 1,
                flexShrink: 0,
              }}
            />
          )}
          <Typography noWrap variant="body2">
            {season.title} {count !== undefined && `(${count})`}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1} flexShrink={0}>
          {provider && (
            <Typography variant="caption" color="text.secondary">
              {provider.name}
            </Typography>
          )}
          <Box
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <SeasonContextMenu
              season={season}
              onExport={handleExport}
              onDelete={handleDelete}
            />
          </Box>
        </Stack>
      </Stack>
    </>
  )
}

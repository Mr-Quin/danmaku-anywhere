import type { Season } from '@danmaku-anywhere/danmaku-converter'
import { Delete } from '@mui/icons-material'
import {
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  Tooltip,
} from '@mui/material'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { localizedDanmakuSourceType } from '@/common/danmaku/enums'
import { useProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import {
  useSeasonMapMutations,
  useSeasonsByIds,
} from '@/common/seasonMap/queries/useAllSeasonMap'
import type { SeasonMap } from '@/common/seasonMap/SeasonMap'
import { ProviderLogo } from '../ProviderLogo'

type TitleMappingDetailsProps = {
  map: SeasonMap
}

export const TitleMappingDetails = ({ map }: TitleMappingDetailsProps) => {
  const { t } = useTranslation()
  const { configs } = useProviderConfig()
  const mutations = useSeasonMapMutations()

  // Fetch season details for all mapped seasons
  const seasonIds = useMemo(() => Array.from(map.seasonIds), [map])
  const { data: seasons = [] } = useSeasonsByIds(seasonIds)
  const seasonLookup = useMemo(() => {
    const lookup = new Map<number, Season>()
    for (const season of seasons) {
      lookup.set(season.id, season)
    }
    return lookup
  }, [seasons])

  const handleRemoveMapping = async (providerId: string) => {
    await mutations.removeProvider.mutateAsync({
      key: map.key,
      providerConfigId: providerId,
    })
  }

  // Filter configs to only show mapped ones
  const mappedConfigs = configs.filter((config) => map.getSeasonId(config.id))

  if (mappedConfigs.length === 0) {
    return null
  }

  return (
    <Paper variant="outlined">
      <List disablePadding>
        {mappedConfigs.map((config) => {
          const seasonId = map.getSeasonId(config.id)
          const mappedSeason = seasonId ? seasonLookup.get(seasonId) : undefined

          return (
            <ListItem key={config.id} divider>
              <ListItemAvatar>
                <ProviderLogo provider={config.impl} />
              </ListItemAvatar>
              <ListItemText
                primary={
                  config.isBuiltIn
                    ? localizedDanmakuSourceType(config.impl)
                    : config.name
                }
                secondary={mappedSeason?.title || `Season ID: ${seasonId}`}
              />
              <ListItemSecondaryAction>
                <Tooltip title={t('common.remove', 'Remove')}>
                  <IconButton
                    edge="end"
                    onClick={() => handleRemoveMapping(config.id)}
                  >
                    <Delete />
                  </IconButton>
                </Tooltip>
              </ListItemSecondaryAction>
            </ListItem>
          )
        })}
      </List>
    </Paper>
  )
}

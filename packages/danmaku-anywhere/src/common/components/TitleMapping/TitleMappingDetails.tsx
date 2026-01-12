import type { Season } from '@danmaku-anywhere/danmaku-converter'
import { Autocomplete, Box, styled, TextField, Typography } from '@mui/material'
import { Fragment, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useGetAllSeasonsSuspense } from '@/common/anime/queries/useGetAllSeasonsSuspense'
import { localizedDanmakuSourceType } from '@/common/danmaku/enums'
import { useProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { useSeasonMapMutations } from '@/common/seasonMap/queries/useAllSeasonMap'
import type { SeasonMap } from '@/common/seasonMap/SeasonMap'
import { matchWithPinyin } from '@/common/utils/utils'

const BoxGrid = styled(Box)(({ theme }) => {
  return {
    display: 'grid',
    gridTemplateColumns: 'minmax(140px, 1fr) 2fr',
    alignItems: 'center',
    rowGap: theme.spacing(2),
    padding: theme.spacing(0, 2),
  }
})

type TitleMappingDetailsProps = {
  map: SeasonMap
}

export const TitleMappingDetails = ({ map }: TitleMappingDetailsProps) => {
  const { t } = useTranslation()
  const { configs } = useProviderConfig()
  const mutations = useSeasonMapMutations()

  const { data: allSeasons } = useGetAllSeasonsSuspense()

  const handleChange = async (
    providerConfigId: string,
    newValue: Season | null
  ) => {
    if (newValue) {
      await mutations.add.mutateAsync(
        map.withMapping(providerConfigId, newValue.id)
      )
    } else {
      await mutations.add.mutateAsync(map.withoutProvider(providerConfigId))
    }
  }

  const seasonsByProvider = useMemo(() => {
    const grouped = new Map<string, Season[]>()
    for (const season of allSeasons) {
      const existing = grouped.get(season.providerConfigId) ?? []
      existing.push(season)
      grouped.set(season.providerConfigId, existing)
    }
    return grouped
  }, [allSeasons])

  return (
    <BoxGrid>
      {configs.map((config) => {
        const seasonId = map.getSeasonId(config.id)
        const selectedSeason = seasonId
          ? allSeasons.find((s) => s.id === seasonId) || null
          : null
        const options = seasonsByProvider.get(config.id) ?? []

        return (
          <Fragment key={config.id}>
            <Typography variant="body2">
              {config.isBuiltIn
                ? localizedDanmakuSourceType(config.impl)
                : config.name}
            </Typography>

            <Autocomplete<Season>
              options={options}
              getOptionLabel={(option) => option.title}
              value={selectedSeason}
              onChange={(_, newValue) => handleChange(config.id, newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  variant="outlined"
                  placeholder={t('titleMapping.unmapped', 'Unmapped')}
                  fullWidth
                />
              )}
              filterOptions={(options, state) => {
                return options.filter((option) => {
                  return matchWithPinyin(option.title, state.inputValue)
                })
              }}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText={t(
                'titleMapping.noSeasons',
                'No options for the selected provider'
              )}
            />
          </Fragment>
        )
      })}
    </BoxGrid>
  )
}

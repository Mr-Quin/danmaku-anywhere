import type { Season } from '@danmaku-anywhere/danmaku-converter'
import { Autocomplete, Box, styled, TextField, Typography } from '@mui/material'
import { Fragment, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useGetAllSeasonsSuspense } from '@/common/anime/queries/useGetAllSeasonsSuspense'
import { localizedDanmakuSourceType } from '@/common/danmaku/enums'
import type { NamingRule } from '@/common/options/localMatchingRule/schema'
import { useNamingRules } from '@/common/options/localMatchingRule/useLocalMatchingRule'
import { useProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { useSeasonMapMutations } from '@/common/seasonMap/queries/useAllSeasonMap'
import type { SeasonMap } from '@/common/seasonMap/SeasonMap'
import { compareLocale } from '@/common/utils/collator'
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
  const { rules: namingRules } = useNamingRules()

  const { data: allSeasons } = useGetAllSeasonsSuspense({ includeEmpty: true })

  const handleChange = async (
    providerConfigId: string,
    newValue: Season | null
  ) => {
    const updated = newValue
      ? map.withMapping(providerConfigId, newValue.id)
      : map.withoutProvider(providerConfigId)
    if (updated.isEmpty()) {
      await mutations.delete.mutateAsync(updated.key)
    } else {
      await mutations.put.mutateAsync(updated)
    }
  }

  const handleLocalChange = async (newValue: NamingRule | null) => {
    if (newValue) {
      await mutations.add.mutateAsync(map.withLocal(newValue.folderPath))
    } else {
      await mutations.add.mutateAsync(map.withoutLocal())
    }
  }

  const selectedLocal = useMemo(() => {
    if (!map.local) {
      return null
    }
    return namingRules.find((r) => r.folderPath === map.local) ?? null
  }, [map.local, namingRules])

  const seasonsByProvider = useMemo(() => {
    const grouped = new Map<string, Season[]>()
    for (const season of allSeasons) {
      const existing = grouped.get(season.providerConfigId) ?? []
      existing.push(season)
      grouped.set(season.providerConfigId, existing)
    }
    // sort by title
    for (const seasons of grouped.values()) {
      seasons.sort((a, b) => compareLocale(a.title, b.title))
    }
    return grouped
  }, [allSeasons])

  const seasonsById = useMemo(() => {
    return new Map(allSeasons.map((s) => [s.id, s]))
  }, [allSeasons])

  return (
    <Box>
      <BoxGrid>
        <Typography variant="body2">
          {t('namingRule.local', 'Local')}
        </Typography>
        <Autocomplete<NamingRule>
          options={namingRules}
          getOptionLabel={(option) => `${option.title} (${option.folderPath})`}
          getOptionKey={(option) => option.folderPath}
          value={selectedLocal}
          onChange={(_, newValue) => handleLocalChange(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              variant="outlined"
              placeholder={t('titleMapping.unmapped', 'Unmapped')}
              fullWidth
            />
          )}
          isOptionEqualToValue={(option, value) =>
            option.folderPath === value.folderPath
          }
          noOptionsText={t('namingRule.noRules', 'No naming rules defined')}
          slotProps={{
            popper: {
              sx: {
                zIndex: 1403,
              },
            },
          }}
        />
        {configs.map((config) => {
          const seasonId = map.getSeasonId(config.id)
          const selectedSeason = seasonId
            ? seasonsById.get(seasonId) || null
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
                getOptionLabel={(option) => `${option.title} (${option.year})`}
                getOptionKey={(option) => option.id}
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
                slotProps={{
                  popper: {
                    sx: {
                      zIndex: 1403,
                    },
                  },
                }}
              />
            </Fragment>
          )
        })}
      </BoxGrid>
    </Box>
  )
}

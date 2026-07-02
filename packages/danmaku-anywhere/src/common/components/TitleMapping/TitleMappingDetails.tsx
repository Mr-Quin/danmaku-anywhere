import type { Season } from '@danmaku-anywhere/danmaku-converter'
import {
  Autocomplete,
  Box,
  Divider,
  styled,
  TextField,
  Typography,
} from '@mui/material'
import { Fragment, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useGetAllSeasonsSuspense } from '@/common/anime/queries/useGetAllSeasonsSuspense'
import type { NamingRule } from '@/common/options/localMatchingRule/schema'
import { useNamingRules } from '@/common/options/localMatchingRule/useLocalMatchingRule'
import { useProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { computeNamespaceKey } from '@/common/providers/namespaceKey'
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
    namespaceKey: string,
    newValue: Season | null
  ) => {
    const updated = newValue
      ? map.withMapping(namespaceKey, newValue.id)
      : map.withoutProvider(namespaceKey)
    await mutations.put.mutateAsync(updated)
  }

  const handleLocalChange = async (newValue: NamingRule | null) => {
    const updated = newValue
      ? map.withLocal(newValue.folderPath)
      : map.withoutLocal()
    await mutations.put.mutateAsync(updated)
  }

  const selectedLocal = useMemo(() => {
    if (!map.local) {
      return null
    }
    return namingRules.find((r) => r.folderPath === map.local) ?? null
  }, [map.local, namingRules])

  const seasonsByNamespace = useMemo(() => {
    const grouped = new Map<string, Season[]>()
    for (const season of allSeasons) {
      const ns = season.namespaceKey
      if (ns == null) {
        continue
      }
      const existing = grouped.get(ns) ?? []
      existing.push(season)
      grouped.set(ns, existing)
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
        {configs.map((config) => {
          const ns = computeNamespaceKey(config)
          const seasonId = map.getSeasonId(ns)
          const selectedSeason = seasonId
            ? seasonsById.get(seasonId) || null
            : null

          const options = seasonsByNamespace.get(ns) ?? []

          return (
            <Fragment key={config.id}>
              <Typography variant="body2">{config.name}</Typography>

              <Autocomplete<Season>
                options={options}
                getOptionLabel={(option) => `${option.title} (${option.year})`}
                getOptionKey={(option) => option.id}
                value={selectedSeason}
                onChange={(_, newValue) => handleChange(ns, newValue)}
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
        <Divider sx={{ gridColumn: '1 / -1' }} />
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
      </BoxGrid>
    </Box>
  )
}

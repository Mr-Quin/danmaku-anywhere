import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import { ExpandMore } from '@mui/icons-material'
import {
  AccordionDetails,
  AccordionSummary,
  Chip,
  lighten,
  Stack,
  styled,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SeasonSearchResult } from '@/common/components/Season/SeasonSearchResult'
import { localizedDanmakuSourceType } from '@/common/danmaku/enums'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { useProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { OutlineAccordian } from '../OutlineAccordian'

const SearchResultAccordian = styled(OutlineAccordian)(({ theme }) => {
  return {
    ['& .MuiAccordion-heading']: {
      position: 'sticky',
      top: 0,
      zIndex: 1,

      '& .MuiButtonBase-root': {
        backgroundColor: lighten(theme.palette.background.paper, 0.05),
        borderRadius: theme.spacing(1),
      },
    },
  }
})

interface ProviderResultsListProps {
  searchTerm: string
  onSeasonClick: (season: Season | CustomSeason) => void
}

export const ProviderResultsList = ({
  searchTerm,
  onSeasonClick,
}: ProviderResultsListProps) => {
  const { t } = useTranslation()
  const { configs } = useProviderConfig()

  const enabledProviders = useMemo(
    () => configs.filter((c) => c.enabled),
    [configs]
  )

  const [expanded, setExpanded] = useState<string | undefined>(
    enabledProviders[0]?.id
  )

  useEffect(() => {
    // expand the first provider when searchTerm changes
    setExpanded(enabledProviders[0]?.id)
  }, [searchTerm])

  const handleChange = (id: string) => (_: unknown, isExpanded: boolean) => {
    setExpanded(isExpanded ? id : undefined)
  }

  const renderChip = (config: ProviderConfig) => {
    if (config.isBuiltIn) {
      return (
        <Chip
          label={t('providers.builtin', 'Built-in')}
          size="small"
          sx={{ ml: 1 }}
          color="primary"
        />
      )
    }
    return (
      <Chip
        label={t(localizedDanmakuSourceType(config.impl))}
        size="small"
        sx={{ ml: 1 }}
      />
    )
  }

  return (
    <Stack direction="column" spacing={1} sx={{ alignSelf: 'stretch' }}>
      {enabledProviders.map((provider) => (
        <SearchResultAccordian
          key={provider.id}
          expanded={expanded === provider.id}
          onChange={handleChange(provider.id)}
          disableGutters
          elevation={0}
          slotProps={{ transition: { unmountOnExit: true } }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>
              {provider.isBuiltIn
                ? t(localizedDanmakuSourceType(provider.impl))
                : provider.name}
            </Typography>
            {renderChip(provider)}
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <SeasonSearchResult
              searchParams={{ anime: searchTerm }}
              provider={provider}
              onSeasonClick={onSeasonClick}
              stale={false}
            />
          </AccordionDetails>
        </SearchResultAccordian>
      ))}
    </Stack>
  )
}

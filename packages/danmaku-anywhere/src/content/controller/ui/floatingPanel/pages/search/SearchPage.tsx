import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import { Box, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Center } from '@/common/components/Center'
import { SearchPageCore } from '@/common/components/SearchPageCore/SearchPageCore'
import { isNotCustom } from '@/common/danmaku/utils'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { useProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { useAllSeasonMap } from '@/common/seasonMap/queries/useAllSeasonMap'
import { SeasonMap } from '@/common/seasonMap/SeasonMap'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { usePopup } from '@/content/controller/store/popupStore'
import { useStore } from '@/content/controller/store/store'
import { SeasonDetailsPage } from '@/content/controller/ui/floatingPanel/pages/search/SeasonDetailsPage'
import { useShowAddSeasonMapDialog } from './AddSeasonMapDialog'

export const SearchPage = (): React.ReactElement | null => {
  const { t } = useTranslation()
  const { searchTitle, setSearchTitle } = usePopup()
  const { mediaInfo } = useStore.use.integration()
  const { enabledProviders } = useProviderConfig()
  const { mountDanmaku } = useLoadDanmaku()
  const { data: seasonMaps } = useAllSeasonMap()

  const [selectedSeason, setSelectedSeason] = useState<
    Season | CustomSeason | undefined
  >()
  const [selectedProvider, setSelectedProvider] = useState<
    ProviderConfig | undefined
  >()

  const showAddSeasonMapDialog = useShowAddSeasonMapDialog()

  useEffect(() => {
    if (!mediaInfo) {
      return
    }
    setSearchTitle(mediaInfo.seasonTitle)
  }, [mediaInfo])

  const handleDialogProceed = (season: Season) => {
    setSelectedSeason(season)
  }

  const handleSeasonClick = (
    season: Season | CustomSeason,
    provider: ProviderConfig
  ) => {
    if (
      isNotCustom(season) &&
      mediaInfo &&
      !SeasonMap.hasMapping(
        seasonMaps,
        mediaInfo.getKey(),
        season.providerConfigId,
        season.id
      )
    ) {
      showAddSeasonMapDialog({
        season,
        mapKey: mediaInfo.getKey(),
        onProceed: handleDialogProceed,
      })
    } else {
      setSelectedSeason(season)
      setSelectedProvider(provider)
    }
  }

  if (!enabledProviders.length) {
    return (
      <Box flexGrow={1}>
        <Center>
          <Typography>
            {t(
              'searchPage.error.noProviders',
              'No danmaku sources enabled, please enable in settings'
            )}
          </Typography>
        </Center>
      </Box>
    )
  }

  if (selectedSeason && selectedProvider)
    return (
      <SeasonDetailsPage
        season={selectedSeason}
        provider={selectedProvider}
        onGoBack={() => {
          setSelectedSeason(undefined)
          setSelectedProvider(undefined)
        }}
      />
    )

  return (
    <SearchPageCore
      searchTerm={searchTitle}
      onSearchTermChange={setSearchTitle}
      onSeasonClick={handleSeasonClick}
      onImportSuccess={(episode) => mountDanmaku([episode])}
    />
  )
}

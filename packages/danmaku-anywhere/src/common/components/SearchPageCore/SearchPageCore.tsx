import type {
  CustomSeason,
  Episode,
  Season,
  SeasonInsert,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { Settings } from '@mui/icons-material'
import { IconButton } from '@mui/material'
import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { SearchForm } from './SearchForm'
import { SearchSettings } from './SearchSettings'

export interface SearchPageCoreProps {
  onSeasonClick: (
    season: Season | SeasonInsert | CustomSeason,
    provider: ProviderConfig
  ) => void
  onImportSuccess?: (episode: WithSeason<Episode>) => void
  searchTerm: string
  onSearchTermChange: (term: string) => void
  providerId?: string
  onProviderIdChange: (id: string) => void
  dragOverlayPortal?: HTMLElement | null
  ref?: RefObject<HTMLDivElement | null>
  focusToken?: number
}

export function SearchPageCore({
  onSeasonClick,
  onImportSuccess,
  searchTerm,
  onSearchTermChange,
  providerId,
  onProviderIdChange,
  dragOverlayPortal,
  ref,
  focusToken,
}: SearchPageCoreProps) {
  const { t } = useTranslation()
  const dialog = useDialog()

  const handleOpenSettings = () => {
    dialog.open({
      title: t('searchPage.settings.title', 'Settings'),
      content: <SearchSettings dragOverlayPortal={dragOverlayPortal} />,
      hideCancel: true,
      hideConfirm: true,
      showCloseButton: true,
      dialogProps: { fullWidth: true },
    })
  }

  return (
    <TabLayout ref={ref}>
      <TabToolbar title={t('searchPage.title', 'Search')}>
        <IconButton
          aria-label={t('searchPage.settings.title', 'Settings')}
          onClick={handleOpenSettings}
        >
          <Settings fontSize="small" />
        </IconButton>
      </TabToolbar>

      <SearchForm
        searchTerm={searchTerm}
        onSearchTermChange={onSearchTermChange}
        providerId={providerId}
        onProviderIdChange={onProviderIdChange}
        onSeasonClick={onSeasonClick}
        onImportSuccess={onImportSuccess}
        focusToken={focusToken}
      />
    </TabLayout>
  )
}

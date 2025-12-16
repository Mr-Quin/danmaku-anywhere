import type {
  CustomSeason,
  Episode,
  Season,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { Settings } from '@mui/icons-material'
import {
  IconButton,
  Stack,
  styled,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import { type RefObject, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { ParseTabCore } from '@/common/components/SearchPageCore/ParseTabCore'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { useDialog } from '../Dialog/dialogStore'
import { ScrollBox } from '../layout/ScrollBox'
import { SearchForm } from './SearchForm'
import { SearchSettings } from './SearchSettings'

export interface SearchPageCoreProps {
  onSeasonClick: (
    season: Season | CustomSeason,
    provider: ProviderConfig
  ) => void
  onImportSuccess: (episode: WithSeason<Episode>) => void
  searchTerm: string
  onSearchTermChange: (term: string) => void
  dragOverlayPortal?: HTMLElement | null
  ref?: RefObject<HTMLDivElement | null>
}

const StyledToggleButtonGroup = styled(ToggleButtonGroup)(({ theme }) => {
  return {
    margin: theme.spacing(1),
    height: '32px',
    minHeight: '32px',

    '& .MuiButtonBase-root': {
      flexGrow: 1,
    },
  }
})

export const SearchPageCore = ({
  onSeasonClick,
  onImportSuccess,
  searchTerm,
  onSearchTermChange,
  dragOverlayPortal,
  ref,
}: SearchPageCoreProps) => {
  const { t } = useTranslation()

  const dialog = useDialog()

  const [tab, setTab] = useState<'search' | 'parse'>('search')

  const handleSearch = (term: string) => {
    onSearchTermChange(term)
  }

  const handleOpenSettings = () => {
    dialog.open({
      title: t('searchPage.settings.title', 'Settings'),
      content: <SearchSettings dragOverlayPortal={dragOverlayPortal} />,
      hideCancel: true,
      hideConfirm: true,
      showCloseButton: true,
      dialogProps: {
        fullWidth: true,
      },
    })
  }

  return (
    <TabLayout ref={ref}>
      <TabToolbar title={t('searchPage.name', 'Search Anime')}>
        <Stack direction="row" justifyContent="space-between">
          <StyledToggleButtonGroup
            value={tab}
            onChange={(_, newValue) => {
              if (newValue) {
                setTab(newValue)
              }
            }}
            exclusive
            size="small"
            color="primary"
          >
            <ToggleButton value="search">
              {t('searchPage.name', 'Search Anime')}
            </ToggleButton>
            <ToggleButton value="parse">
              {t('searchPage.parse.name', 'Parse URL')}
            </ToggleButton>
          </StyledToggleButtonGroup>
          <IconButton
            disabled={tab !== 'search'}
            size="small"
            sx={{ alignSelf: 'center' }}
            onClick={handleOpenSettings}
          >
            <Settings fontSize="small" />
          </IconButton>
        </Stack>
      </TabToolbar>

      <ScrollBox sx={{ overflow: 'auto' }}>
        {tab === 'search' && (
          <SearchForm
            onSearch={handleSearch}
            searchTerm={searchTerm}
            onSearchTermChange={onSearchTermChange}
            onSeasonClick={onSeasonClick}
          />
        )}
        {tab === 'parse' && <ParseTabCore onImportSuccess={onImportSuccess} />}
      </ScrollBox>
    </TabLayout>
  )
}

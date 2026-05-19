import type {
  CustomSeason,
  Episode,
  Season,
  SeasonInsert,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { Settings } from '@mui/icons-material'
import {
  Box,
  IconButton,
  styled,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import { type RefObject, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { ScrollBox } from '@/common/components/layout/ScrollBox'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { ParseTabCore } from '@/common/components/SearchPageCore/ParseTabCore'
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
  dragOverlayPortal?: HTMLElement | null
  ref?: RefObject<HTMLDivElement | null>
}

const ModeToggleGroup = styled(ToggleButtonGroup)(({ theme }) => ({
  height: 28,
  minHeight: 28,
  padding: 2,
  borderRadius: 8,
  backgroundColor: theme.palette.paperAlt,
  '& .MuiToggleButton-root': {
    flexGrow: 1,
    height: 24,
    minHeight: 24,
    border: 0,
    borderRadius: 6,
    paddingInline: 10,
    color: theme.palette.text.secondary,
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'none',
    letterSpacing: 0.1,
    '&.Mui-selected': {
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
      boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    },
    '&.Mui-selected:hover': {
      backgroundColor: theme.palette.background.paper,
    },
  },
}))

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

      <Box sx={{ px: 1.25, pt: 1, pb: 0.5, flexShrink: 0 }}>
        <ModeToggleGroup
          value={tab}
          onChange={(_, next) => {
            if (next) {
              setTab(next)
            }
          }}
          exclusive
          fullWidth
        >
          <ToggleButton value="search">
            {t('searchPage.name', 'Search Anime')}
          </ToggleButton>
          <ToggleButton value="parse">
            {t('searchPage.parse.name', 'Parse URL')}
          </ToggleButton>
        </ModeToggleGroup>
      </Box>

      <ScrollBox sx={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
        {tab === 'search' && (
          <SearchForm
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

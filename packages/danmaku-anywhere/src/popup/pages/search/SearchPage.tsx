import { Settings } from '@mui/icons-material'
import {
  IconButton,
  styled,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { useStoreScrollPosition } from '@/common/hooks/useStoreScrollPosition'
import { ParseTab } from '@/popup/pages/search/ParseTab'
import { SearchTab } from '@/popup/pages/search/SearchTab'

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

export const SearchPage = () => {
  const [tab, setTab] = useState('search')
  const { t } = useTranslation()

  const layoutRef = useStoreScrollPosition<HTMLDivElement>('searchPage')

  return (
    <TabLayout ref={layoutRef}>
      <TabToolbar title={t('searchPage.name', 'Search Anime')}>
        <IconButton>
          <Settings />
        </IconButton>
      </TabToolbar>

      <StyledToggleButtonGroup
        value={tab}
        onChange={(_, newValue) => setTab(newValue)}
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
      {tab === 'search' && <SearchTab />}
      {tab === 'parse' && <ParseTab />}
    </TabLayout>
  )
}

import { Tab, Tabs } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { useStoreScrollPosition } from '@/common/hooks/useStoreScrollPosition'
import { ParseTab } from '@/popup/pages/search/ParseTab'
import { SearchTab } from '@/popup/pages/search/SearchTab'

export const SearchPage = () => {
  const [tab, setTab] = useState('search')
  const { t } = useTranslation()

  const layoutRef = useStoreScrollPosition<HTMLDivElement>('searchPage')

  return (
    <TabLayout ref={layoutRef}>
      <TabToolbar>
        <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)}>
          <Tab label={t('searchPage.name')} value="search" />
          <Tab label={t('searchPage.parse.name')} value="parse" />
        </Tabs>
      </TabToolbar>
      {tab === 'search' && <SearchTab />}
      {tab === 'parse' && <ParseTab />}
    </TabLayout>
  )
}

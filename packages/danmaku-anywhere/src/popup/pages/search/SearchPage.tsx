import { Tab, Tabs } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { ParseTab } from '@/popup/pages/search/ParseTab'
import { SearchTab } from '@/popup/pages/search/SearchTab'

export const SearchPage = () => {
  const [tab, setTab] = useState('search')
  const { t } = useTranslation()

  return (
    <TabLayout>
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

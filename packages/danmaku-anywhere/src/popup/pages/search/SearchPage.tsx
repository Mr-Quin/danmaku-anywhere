import { Tab, Tabs } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { ParseTab } from '@/popup/pages/search/ParseTab'
import { SearchTab } from '@/popup/pages/search/SearchTab'
import { useStore } from '@/popup/store'

export const SearchPage = () => {
  const [tab, setTab] = useState('search')
  const { t } = useTranslation()

  // Store the scroll position to restore after the page is unmounted
  const search = useStore.use.search()

  const layoutRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    layoutRef.current?.scrollTo(0, search.scrollTop)
  }, [])

  return (
    <TabLayout
      ref={layoutRef}
      onScroll={(e) => {
        search.setScrollTop(e.currentTarget.scrollTop)
      }}
    >
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

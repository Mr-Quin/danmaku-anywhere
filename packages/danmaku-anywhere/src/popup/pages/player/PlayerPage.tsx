import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import type { KazumiPolicy } from '@/popup/pages/player/useKazumiPolicies'
import { useStore } from '@/popup/store'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router'
import { SearchBar } from './components/SearchBar'

export const PlayerPage = () => {
  const { t } = useTranslation()

  const { setKeyword, setKazumiPolicy } = useStore.use.player()

  const handleSearch = (keyword: string, policy: KazumiPolicy) => {
    setKazumiPolicy(policy)
    setKeyword(keyword)
  }

  return (
    <TabLayout>
      <TabToolbar title={t('tabs.player')} />
      <SearchBar onSearch={handleSearch} />

      <Outlet />
    </TabLayout>
  )
}

import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router'
import { RuleSelector } from './components/RuleSelector'

export const PlayerPage = () => {
  const { t } = useTranslation()

  return (
    <TabLayout>
      <TabToolbar title={t('tabs.player')} />
      <RuleSelector />
      <Outlet />
    </TabLayout>
  )
}

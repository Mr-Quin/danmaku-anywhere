import { useTranslation } from 'react-i18next'

import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { AnalyticsOption } from '@/popup/pages/options/pages/advanced/components/AnalyticsOption'
import { DebugOption } from '@/popup/pages/options/pages/advanced/components/DebugOption'
import { SimplifiedSearchListItem } from '@/popup/pages/options/pages/advanced/components/SimplifiedSearchListItem'

export const AdvancedOptions = () => {
  const { t } = useTranslation()

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title={t('optionsPage.pages.advanced')} />
      <SimplifiedSearchListItem />
      <AnalyticsOption />
      <DebugOption />
    </OptionsPageLayout>
  )
}

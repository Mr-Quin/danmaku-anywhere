import { useTranslation } from 'react-i18next'

import { TabToolbar } from '@/popup/component/TabToolbar'

export const Toolbar = () => {
  const { t } = useTranslation()

  return <TabToolbar title={t('integrationPolicyPage.name')}></TabToolbar>
}

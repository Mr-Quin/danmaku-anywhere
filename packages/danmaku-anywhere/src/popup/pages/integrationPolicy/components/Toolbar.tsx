import { useTranslation } from 'react-i18next'

import { TabToolbar } from '@/content/common/TabToolbar'

export const Toolbar = () => {
  const { t } = useTranslation()

  return <TabToolbar title={t('integrationPolicyPage.name')}></TabToolbar>
}

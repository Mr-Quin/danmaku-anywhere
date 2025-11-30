import { useTranslation } from 'react-i18next'
import { Outlet, useNavigate } from 'react-router'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import type { Integration } from '@/common/options/integrationPolicyStore/schema'
import { useGoBack } from '@/popup/hooks/useGoBack'
import { IntegrationPolicyList } from '../components/IntegrationPolicyList'

export const IntegrationPolicy = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const goBack = useGoBack()

  const handleEdit = (item: Integration) => {
    navigate('edit', { state: item })
  }

  return (
    <>
      <TabLayout>
        <TabToolbar
          title={t('integrationPolicyPage.name', 'Integration Policy')}
          showBackButton
          onGoBack={goBack}
        />
        <IntegrationPolicyList onEdit={handleEdit} />
      </TabLayout>
      <Outlet />
    </>
  )
}

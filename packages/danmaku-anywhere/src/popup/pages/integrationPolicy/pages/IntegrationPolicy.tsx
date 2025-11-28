import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useNavigate } from 'react-router'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import type { Integration } from '@/common/options/integrationPolicyStore/schema'
import { useGoBack } from '@/popup/hooks/useGoBack'
import { ConfirmDeleteDialog } from '../components/ConfirmDeleteDialog'
import { IntegrationPolicyList } from '../components/IntegrationPolicyList'

export const IntegrationPolicy = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const goBack = useGoBack()

  const [editingPolicy, setEditingPolicy] = useState<Integration>()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleEdit = (item: Integration) => {
    navigate('edit', { state: item })
  }

  const handleDelete = (item: Integration) => {
    setEditingPolicy(item)
    setShowDeleteDialog(true)
  }

  return (
    <>
      <TabLayout>
        <TabToolbar
          title={t('integrationPolicyPage.name')}
          showBackButton
          onGoBack={goBack}
        />
        <IntegrationPolicyList onEdit={handleEdit} onDelete={handleDelete} />
        {editingPolicy && (
          <ConfirmDeleteDialog
            policy={editingPolicy}
            open={showDeleteDialog}
            onClose={() => setShowDeleteDialog(false)}
            onDeleted={() => {
              setEditingPolicy(undefined)
            }}
          />
        )}
      </TabLayout>
      <Outlet />
    </>
  )
}

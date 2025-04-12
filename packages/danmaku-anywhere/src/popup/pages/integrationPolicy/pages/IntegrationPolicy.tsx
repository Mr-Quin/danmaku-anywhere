import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router'

import { ConfirmDeleteDialog } from '../components/ConfirmDeleteDialog'
import { IntegrationPolicyList } from '../components/IntegrationPolicyList'
import { Toolbar } from '../components/Toolbar'

import type { Integration } from '@/common/options/integrationPolicyStore/schema'
import { TabLayout } from '@/content/common/TabLayout'

export const IntegrationPolicy = () => {
  const navigate = useNavigate()

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
        <Toolbar />
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

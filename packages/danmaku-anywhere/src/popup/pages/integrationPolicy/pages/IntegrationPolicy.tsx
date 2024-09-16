import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'

import { ConfirmDeleteDialog } from '../components/ConfirmDeleteDialog'
import { IntegrationPolicyList } from '../components/IntegrationPolicyList'
import { Toolbar } from '../components/Toolbar'

import { createXPathPolicy } from '@/common/options/integrationPolicyStore/consant'
import type { IntegrationPolicyItem } from '@/common/options/integrationPolicyStore/schema'
import { TabLayout } from '@/popup/layout/TabLayout'

export const IntegrationPolicy = () => {
  const navigate = useNavigate()

  const [editingPolicy, setEditingPolicy] = useState<IntegrationPolicyItem>()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleEdit = (item: IntegrationPolicyItem) => {
    navigate('edit', { state: item })
  }

  const handleAdd = () => {
    navigate('add', { state: { name: '', policy: createXPathPolicy() } })
  }

  const handleDelete = (item: IntegrationPolicyItem) => {
    setEditingPolicy(item)
    setShowDeleteDialog(true)
  }

  return (
    <>
      <TabLayout>
        <Toolbar onAdd={handleAdd} />
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

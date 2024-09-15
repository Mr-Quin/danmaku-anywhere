import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'

import { ConfirmDeleteDialog } from '../components/ConfirmDeleteDialog'
import { Toolbar } from '../components/Toolbar'
import { XPathPolicyList } from '../components/XPathPolicyList'

import type { XPathPolicyItem } from '@/common/options/xpathPolicyStore/schema'
import { TabLayout } from '@/popup/layout/TabLayout'

export const IntegrationPolicy = () => {
  const navigate = useNavigate()

  const [editingPolicy, setEditingPolicy] = useState<XPathPolicyItem>()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleEdit = (item: XPathPolicyItem) => {
    navigate('edit', { state: item })
  }

  const handleAdd = () => {
    navigate('add', { state: { policy: {} } })
  }

  const handleDelete = (item: XPathPolicyItem) => {
    setEditingPolicy(item)
    setShowDeleteDialog(true)
  }

  return (
    <>
      <TabLayout>
        <Toolbar onAdd={handleAdd} />
        <XPathPolicyList onEdit={handleEdit} onDelete={handleDelete} />
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

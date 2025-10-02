import { Outlet, useNavigate } from 'react-router'
import { createCustomDanDanPlayProvider, createCustomMacCmsProvider } from '@/common/options/providerConfig/constant'
import { TabLayout } from '@/content/common/TabLayout'
import { useStore } from '@/popup/store'
import { ConfirmDeleteDialog } from '../components/ConfirmDeleteDialog'
import { ProviderConfigList } from '../components/ProviderConfigList'
import { ProviderToolbar } from '../components/ProviderToolbar'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'

export const ProvidersPage = () => {
  const { setEditingProvider } = useStore.use.providers()
  const navigate = useNavigate()

  const handleEditProvider = (provider: ProviderConfig) => {
    navigate('edit')
    setEditingProvider(provider)
  }

  const handleAddDanDanPlayProvider = () => {
    navigate('add')
    setEditingProvider(createCustomDanDanPlayProvider())
  }

  const handleAddMacCmsProvider = () => {
    navigate('add')
    setEditingProvider(createCustomMacCmsProvider())
  }

  return (
    <>
      <TabLayout>
        <ProviderToolbar
          onAddDanDanPlayProvider={handleAddDanDanPlayProvider}
          onAddMacCmsProvider={handleAddMacCmsProvider}
        />
        <ProviderConfigList onEdit={handleEditProvider} />
        <ConfirmDeleteDialog />
      </TabLayout>
      <Outlet />
    </>
  )
}

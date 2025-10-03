import { Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { useEditProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { useGoBack } from '@/popup/hooks/useGoBack'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { useStore } from '@/popup/store'
import { BilibiliProviderForm } from '../components/forms/BilibiliProviderForm'
import { DanDanPlayCompatibleProviderForm } from '../components/forms/DanDanPlayCompatibleProviderForm'
import { DanDanPlayProviderForm } from '../components/forms/DanDanPlayProviderForm'
import { MacCmsProviderForm } from '../components/forms/MacCmsProviderForm'
import { TencentProviderForm } from '../components/forms/TencentProviderForm'

interface ProviderEditorProps {
  mode: 'add' | 'edit'
}

export const ProviderEditor = ({ mode }: ProviderEditorProps) => {
  const { t } = useTranslation()
  const { update, create } = useEditProviderConfig()
  const goBack = useGoBack()
  const toast = useToast.use.toast()

  const isEdit = mode === 'edit'
  const { editingProvider: provider } = useStore.use.providers()

  console.log('provider', provider)

  if (!provider) {
    return null
  }

  const handleSave = async (data: ProviderConfig) => {
    if (isEdit && provider.id) {
      return update.mutate(
        { id: provider.id, config: data },
        {
          onSuccess: () => {
            toast.success(t('providers.alert.updated'))
            goBack()
          },
          onError: (error) => {
            toast.error(error.message)
          },
        }
      )
    }

    return create.mutate(data, {
      onSuccess: () => {
        toast.success(t('providers.alert.created'))
        goBack()
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })
  }

  const getTitle = () => {
    if (isEdit) {
      return t('providers.editor.title.edit', { name: provider.name })
    }
    if (provider.type === 'DanDanPlayCompatible') {
      return t('providers.editor.title.addDanDanPlay')
    }
    if (provider.type === 'MacCMS') {
      return t('providers.editor.title.addMacCms')
    }
    return t('providers.editor.title.add')
  }

  const renderForm = () => {
    switch (provider.type) {
      case 'DanDanPlay':
        return (
          <DanDanPlayProviderForm
            provider={provider}
            onSubmit={handleSave}
            isEdit={isEdit}
          />
        )
      case 'Bilibili':
        return (
          <BilibiliProviderForm
            provider={provider}
            onSubmit={handleSave}
            isEdit={isEdit}
          />
        )
      case 'Tencent':
        return (
          <TencentProviderForm
            provider={provider}
            onSubmit={handleSave}
            isEdit={isEdit}
          />
        )
      case 'DanDanPlayCompatible':
        return (
          <DanDanPlayCompatibleProviderForm
            provider={provider}
            onSubmit={handleSave}
            isEdit={isEdit}
          />
        )
      case 'MacCMS':
        return (
          <MacCmsProviderForm
            provider={provider}
            onSubmit={handleSave}
            isEdit={isEdit}
          />
        )
      default:
        return null
    }
  }

  return (
    <OptionsPageLayout direction="left">
      <OptionsPageToolBar title={getTitle()} />
      <Box p={2}>{renderForm()}</Box>
    </OptionsPageLayout>
  )
}

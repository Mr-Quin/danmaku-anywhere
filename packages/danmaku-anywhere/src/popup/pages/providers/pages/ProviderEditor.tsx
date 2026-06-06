import {
  LEGACY_MACCMS_ID,
  PROVIDER_TO_BUILTIN_ID,
} from '@danmaku-anywhere/danmaku-converter'
import { Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { useEditProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { MacCmsProviderForm } from '../components/forms/MacCmsProviderForm'
import { ProviderConfigForm } from '../components/forms/ProviderConfigForm'

interface ProviderEditorProps {
  mode: 'add' | 'edit'
  provider: ProviderConfig
  onClose: () => void
}

export const ProviderEditor = ({
  mode,
  provider,
  onClose,
}: ProviderEditorProps) => {
  const { t } = useTranslation()
  const { update, create } = useEditProviderConfig()
  const toast = useToast.use.toast()

  const isEdit = mode === 'edit'

  const handleSave = async (data: ProviderConfig) => {
    if (isEdit && provider.id) {
      return update.mutate(
        { id: provider.id, config: data },
        {
          onSuccess: () => {
            toast.success(t('providers.alert.updated', 'Provider updated'))
            onClose()
          },
          onError: (error) => {
            toast.error(error.message)
          },
        }
      )
    }

    return create.mutate(data, {
      onSuccess: () => {
        toast.success(t('providers.alert.created', 'Provider created'))
        onClose()
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })
  }

  const isCustomDdp =
    provider.manifestId ===
      PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay] &&
    !provider.isBuiltIn

  const getTitle = () => {
    if (isEdit) {
      return t('providers.editor.title.edit', 'Edit Provider: {{name}}', {
        name: provider.name,
      })
    }
    if (isCustomDdp) {
      return t(
        'providers.editor.title.addDanDanPlay',
        'Add DanDanPlay Compatible Provider'
      )
    }
    if (provider.manifestId === LEGACY_MACCMS_ID) {
      return t('providers.editor.title.addMacCms', 'Add MacCMS Provider')
    }
    return t('providers.editor.title.add', 'Add Provider')
  }

  const renderForm = () => {
    if (provider.manifestId === LEGACY_MACCMS_ID) {
      return (
        <MacCmsProviderForm
          provider={provider}
          onSubmit={handleSave}
          isEdit={isEdit}
        />
      )
    }
    return (
      <ProviderConfigForm
        provider={provider}
        onSubmit={handleSave}
        isEdit={isEdit}
      />
    )
  }

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title={getTitle()} onGoBack={onClose} />
      <Box
        sx={{
          p: 2,
        }}
      >
        {renderForm()}
      </Box>
    </OptionsPageLayout>
  )
}

import { PROVIDER_TO_BUILTIN_ID } from '@danmaku-anywhere/danmaku-converter'
import { Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { describeError } from '@/common/errors/describeError'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { useEditProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { isLegacyMacCms } from '@/common/options/providerConfig/utils'
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
            toast.success(t('providers.alert.updated', 'Source updated'))
            onClose()
          },
          onError: (error) => {
            toast.error(describeError(error).message)
          },
        }
      )
    }

    return create.mutate(data, {
      onSuccess: () => {
        toast.success(t('providers.alert.created', 'Source created'))
        onClose()
      },
      onError: (error) => {
        toast.error(describeError(error).message)
      },
    })
  }

  const isCustomDdp =
    provider.manifestId === PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay]

  const getTitle = () => {
    if (isEdit) {
      return t('providers.editor.title.edit', 'Edit Source: {{name}}', {
        name: provider.name,
      })
    }
    if (isCustomDdp) {
      return t(
        'providers.editor.title.addDanDanPlay',
        'Add DanDanPlay Compatible Source'
      )
    }
    if (isLegacyMacCms(provider)) {
      return t('providers.editor.title.addMacCms', 'Add VOD Source')
    }
    return t('providers.editor.title.add', 'Add Source')
  }

  const renderForm = () => {
    if (isLegacyMacCms(provider)) {
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

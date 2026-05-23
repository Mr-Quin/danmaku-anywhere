import {
  LEGACY_MACCMS_ID,
  PROVIDER_TO_BUILTIN_ID,
} from '@danmaku-anywhere/danmaku-converter'
import { Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { DDP_COMPAT_MANIFEST_ID } from '@/common/options/providerConfig/constant'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { useEditProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { BilibiliProviderForm } from '../components/forms/BilibiliProviderForm'
import { DanDanPlayCompatibleProviderForm } from '../components/forms/DanDanPlayCompatibleProviderForm'
import { DanDanPlayProviderForm } from '../components/forms/DanDanPlayProviderForm'
import { MacCmsProviderForm } from '../components/forms/MacCmsProviderForm'
import { TencentProviderForm } from '../components/forms/TencentProviderForm'

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

  const getTitle = () => {
    if (isEdit) {
      return t('providers.editor.title.edit', 'Edit Provider: {{name}}', {
        name: provider.name,
      })
    }
    if (provider.manifestId === DDP_COMPAT_MANIFEST_ID) {
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
    switch (provider.manifestId) {
      case PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay]:
        return (
          <DanDanPlayProviderForm
            provider={provider}
            onSubmit={handleSave}
            isEdit={isEdit}
          />
        )
      case PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili]:
        return (
          <BilibiliProviderForm
            provider={provider}
            onSubmit={handleSave}
            isEdit={isEdit}
          />
        )
      // Builtins whose configSchema has no user-facing fields share the same
      // no-config form (just a disabled name + save). The schema-forms
      // initiative will collapse all four of these into one renderer.
      case PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Tencent]:
      case PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Youku]:
      case PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Mango]:
      case PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Iqiyi]:
      case PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Sohu]:
      case PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Maiduidui]:
      case PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Renren]:
      case PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Aiyifan]:
      case PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bahamut]:
        return (
          <TencentProviderForm
            provider={provider}
            onSubmit={handleSave}
            isEdit={isEdit}
          />
        )
      case DDP_COMPAT_MANIFEST_ID:
        return (
          <DanDanPlayCompatibleProviderForm
            provider={provider}
            onSubmit={handleSave}
            isEdit={isEdit}
          />
        )
      case LEGACY_MACCMS_ID:
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

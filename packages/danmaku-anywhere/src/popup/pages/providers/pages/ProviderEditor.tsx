import { PROVIDER_TO_BUILTIN_ID } from '@danmaku-anywhere/danmaku-converter'
import { Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { describeProviderConfigError } from '@/common/options/providerConfig/issueText'
import type {
  ProviderConfigDraft,
  ProviderConfigEdit,
} from '@/common/options/providerConfig/schema'
import { useEditProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { useSourceNames } from '@/common/options/providerConfig/useSourceNames'
import { isLegacyMacCms } from '@/common/options/providerConfig/utils'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { MacCmsProviderForm } from '../components/forms/MacCmsProviderForm'
import { ProviderConfigForm } from '../components/forms/ProviderConfigForm'
import { useManifestSpec } from '../hooks/useManifestSpec'

interface ProviderEditorProps {
  mode: 'add' | 'edit'
  // A stored config when editing, a draft when adding
  provider: ProviderConfigDraft & { id?: string }
  onClose: () => void
}

export const ProviderEditor = ({
  mode,
  provider,
  onClose,
}: ProviderEditorProps) => {
  const { t } = useTranslation()
  const { update, create } = useEditProviderConfig()
  const { nameOf } = useSourceNames()
  // Legacy MacCMS has no manifest to ask for
  const { data: spec } = useManifestSpec(provider.manifestId, {
    enabled: !isLegacyMacCms(provider),
  })
  const configSchema =
    spec?.status === 'ok' ? spec.spec.configSchema : undefined
  const toast = useToast.use.toast()

  const isEdit = mode === 'edit'

  const handleSave = async (edit: Required<ProviderConfigEdit>) => {
    if (isEdit && provider.id) {
      return update.mutate(
        { id: provider.id, edit },
        {
          onSuccess: () => {
            toast.success(t('providers.alert.updated', 'Source updated'))
            onClose()
          },
          onError: (error) => {
            toast.error(describeProviderConfigError(error, configSchema))
          },
        }
      )
    }

    return create.mutate(
      { ...provider, ...edit },
      {
        onSuccess: () => {
          toast.success(t('providers.alert.created', 'Source created'))
          onClose()
        },
        onError: (error) => {
          toast.error(describeProviderConfigError(error, configSchema))
        },
      }
    )
  }

  const isCustomDdp =
    provider.manifestId === PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay]

  const getTitle = () => {
    if (isEdit) {
      return t('providers.editor.title.edit', 'Edit Source: {{name}}', {
        name: nameOf(provider),
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

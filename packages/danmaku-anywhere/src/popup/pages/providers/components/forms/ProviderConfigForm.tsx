import type { ConfigSchema } from '@mr-quin/dango'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
} from '@mui/material'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ErrorMessage } from '@/common/components/ErrorMessage'
import { useToast } from '@/common/components/Toast/toastStore'
import type { SourceUnavailableReason } from '@/common/errors/AppError'
import { describeCode } from '@/common/errors/describeError'
import { lockedConfigKeys } from '@/common/options/providerConfig/builtin'
import { configIssueMessage } from '@/common/options/providerConfig/issueText'
import { useSourceNames } from '@/common/options/providerConfig/useSourceNames'
import { checkProviderConfig } from '@/common/options/providerConfig/validation'
import { useManifestSpec } from '../../hooks/useManifestSpec'
import { FormActions } from './FormActions'
import { SchemaObjectFields } from './SchemaFields'
import {
  buildDefaultValues,
  getObjectFields,
  issueFieldPath,
  mergeConfigValues,
  omitKeys,
} from './schemaForm'
import type { ProviderFormProps } from './types'

interface FormValues {
  name: string
  config: Record<string, unknown>
}

interface ConfigFormProps extends ProviderFormProps {
  configSchema?: ConfigSchema
  // Set when the source's manifest can't run here, so its settings can't be
  // checked or edited and only the name can change.
  unavailable?: SourceUnavailableReason
}

function settingText(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function ConfigForm({
  provider,
  configSchema,
  unavailable,
  onSubmit,
  onReset,
  isEdit,
}: ConfigFormProps) {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  const { defaultNameOf } = useSourceNames()
  const hiddenKeys = lockedConfigKeys(provider)

  const methods = useForm<FormValues>({
    defaultValues: {
      name: provider.customName ?? '',
      config: buildDefaultValues(configSchema, provider.configValues),
    },
  })

  const {
    handleSubmit,
    register,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = methods

  const handleFormSubmit = handleSubmit(async (data) => {
    const configValues = mergeConfigValues(
      provider.configValues,
      omitKeys(data.config, hiddenKeys)
    )
    const customName = data.name.trim() === '' ? null : data.name.trim()
    const issues = checkProviderConfig({
      config: { ...provider, customName, configValues },
      configSchema,
    })
    const messages: string[] = []
    let nameInvalid = false
    for (const issue of issues) {
      if (issue.kind === 'nameTooLong') {
        setError('name', {
          message: t(
            'providers.editor.validation.maxLength',
            'Must be at most {{max}} characters',
            { max: issue.max }
          ),
        })
        nameInvalid = true
        continue
      }
      if (issue.kind !== 'config') {
        continue
      }
      const message = configIssueMessage(issue.issue, configSchema)
      const fieldPath = issueFieldPath(issue.issue)
      const path = fieldPath.join('.')
      setError(path === '' ? 'config' : `config.${path}`, { message })
      // Rendered fields show their own error, so only an error on a field the
      // form does not render needs the toast, named since it has no label to
      // sit next to.
      const [topKey] = fieldPath
      const rendered =
        typeof topKey === 'string' &&
        configSchema?.properties?.[topKey] !== undefined &&
        !hiddenKeys.has(topKey)
      messages.push(rendered || path === '' ? message : `${path}: ${message}`)
    }
    if (messages.length > 0) {
      toast.error(messages[0])
    }
    if (messages.length > 0 || nameInvalid) {
      return
    }
    await onSubmit({ customName, configValues })
  })

  const handleReset = () => {
    reset()
    onReset?.()
  }

  const renderLockedSettings = (reason: SourceUnavailableReason) => {
    const settings = Object.entries(provider.configValues).filter(([key]) => {
      return !hiddenKeys.has(key)
    })
    return (
      <>
        <Alert severity="warning" sx={{ alignSelf: 'stretch' }}>
          <Box>
            {describeCode('manifest.unavailable', {
              manifestId: provider.manifestId,
              reason,
            })}
          </Box>
          <Box>
            {t(
              'providers.editor.settingsLocked',
              "Its settings can't be changed until it can run here. You can still rename it."
            )}
          </Box>
        </Alert>
        {settings.map(([key, value]) => (
          <TextField
            key={key}
            label={key}
            size="small"
            value={settingText(value)}
            slotProps={{
              input: { readOnly: true },
              inputLabel: { shrink: true },
            }}
            fullWidth
          />
        ))}
      </>
    )
  }

  const hidesServer = getObjectFields(configSchema).some((field) =>
    hiddenKeys.has(field.key)
  )

  return (
    <FormProvider {...methods}>
      <Stack
        component="form"
        noValidate
        onSubmit={handleFormSubmit}
        direction="column"
        spacing={2}
        sx={{ alignItems: 'flex-start' }}
      >
        <TextField
          label={t('providers.editor.name', 'Name')}
          size="small"
          placeholder={defaultNameOf(provider)}
          error={!!errors.name}
          helperText={
            errors.name?.message ??
            t(
              'providers.editor.nameDefaultHint',
              'Leave empty to use the default name'
            )
          }
          slotProps={{ inputLabel: { shrink: true } }}
          {...register('name')}
          fullWidth
        />
        {hidesServer ? (
          <Alert severity="info" sx={{ alignSelf: 'stretch' }}>
            {t(
              'providers.editor.builtinServerLocked',
              'The server of a built-in source cannot be changed. To use another server, add an instance instead.'
            )}
          </Alert>
        ) : null}
        {unavailable ? renderLockedSettings(unavailable) : null}
        {configSchema ? (
          <SchemaObjectFields
            schema={configSchema}
            path="config"
            hiddenKeys={hiddenKeys}
          />
        ) : null}
        <FormActions
          isEdit={isEdit}
          isSubmitting={isSubmitting}
          onReset={handleReset}
          disableReset={!isDirty}
        />
      </Stack>
    </FormProvider>
  )
}

export const ProviderConfigForm = (props: ProviderFormProps) => {
  const { t } = useTranslation()
  const { isLoading, isError, isFetching, data, refetch } = useManifestSpec(
    props.provider.manifestId
  )

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (isError) {
    return (
      <ErrorMessage
        message={t(
          'providers.editor.specError',
          'Failed to load source settings. Some fields are missing, saving now would drop them.'
        )}
        size={160}
        beforeContent={
          <Button
            onClick={() => void refetch()}
            variant="text"
            disabled={isFetching}
          >
            {t('common.retry', 'Retry')}
          </Button>
        }
      />
    )
  }

  if (data?.status === 'unavailable') {
    return <ConfigForm {...props} unavailable={data.reason} />
  }

  return <ConfigForm {...props} configSchema={data?.spec.configSchema} />
}

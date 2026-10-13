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
import { lockedConfigKeys } from '@/common/options/providerConfig/builtin'
import { useSourceNames } from '@/common/options/providerConfig/useSourceNames'
import { checkProviderConfig } from '@/common/options/providerConfig/validation'
import { useManifestSpec } from '../../hooks/useManifestSpec'
import { FormActions } from './FormActions'
import { SchemaObjectFields } from './SchemaFields'
import {
  buildDefaultValues,
  configIssueMessage,
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
}

function ConfigForm({
  provider,
  configSchema,
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
    const current =
      isEdit && provider.id !== undefined
        ? { ...provider, id: provider.id }
        : undefined
    const issues = checkProviderConfig({
      current,
      next: { ...provider, customName, configValues },
      configSchema,
    })
    const messages: string[] = []
    for (const issue of issues) {
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
      return
    }
    await onSubmit({ customName, configValues })
  })

  const handleReset = () => {
    reset()
    onReset?.()
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

  return <ConfigForm {...props} configSchema={data?.configSchema} />
}

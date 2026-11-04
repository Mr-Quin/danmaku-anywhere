import type { ConfigSchema } from '@mr-quin/dango'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  FormHelperText,
  Stack,
  TextField,
} from '@mui/material'
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
} from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ErrorMessage } from '@/common/components/ErrorMessage'
import { useToast } from '@/common/components/Toast/toastStore'
import { isBuiltinConfig } from '@/common/options/providerConfig/displayName'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { useManifestSpec } from '../../hooks/useManifestSpec'
import { FormActions } from './FormActions'
import { SchemaObjectFields } from './SchemaFields'
import {
  buildDefaultValues,
  getObjectFields,
  hiddenConfigFields,
  mergeConfigValues,
  validateConfigValues,
} from './schemaForm'
import type { ProviderFormProps } from './types'

interface FormValues {
  name: string
  config: Record<string, unknown>
  allowLocalOrigins: boolean
}

function LocalOriginsToggle() {
  const { t } = useTranslation()
  const { control } = useFormContext<FormValues>()
  return (
    <Box sx={{ width: '100%' }}>
      <FormControlLabel
        control={
          <Controller
            name="allowLocalOrigins"
            control={control}
            render={({ field: { value, ref, ...field } }) => (
              <Checkbox
                {...field}
                slotProps={{ input: { ref } }}
                checked={value}
              />
            )}
          />
        }
        label={t(
          'providers.editor.allowLocalOrigins.label',
          'Allow local network servers'
        )}
        sx={{ color: 'text.secondary' }}
      />
      <FormHelperText sx={{ mt: 0 }}>
        {t(
          'providers.editor.allowLocalOrigins.helper',
          'Lets this source reach private and loopback addresses, such as a self-hosted server on your LAN. Keep it off unless the server address above is one.'
        )}
      </FormHelperText>
    </Box>
  )
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

  const hiddenKeys = hiddenConfigFields(provider)
  const isBuiltin = isBuiltinConfig(provider)

  const methods = useForm<FormValues>({
    defaultValues: {
      name: provider.name,
      config: buildDefaultValues(configSchema, provider.configValues),
      allowLocalOrigins: provider.allowLocalOrigins ?? false,
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
    const configValues = mergeConfigValues(provider.configValues, data.config)
    const configErrors = validateConfigValues(configSchema, configValues)
    if (configErrors.length > 0) {
      for (const error of configErrors) {
        setError(`config.${error.path}`, { message: error.message })
      }
      // Rendered fields are already validated by their own rules, so an error
      // here usually sits on a field the form does not render. Toast it so the
      // blocked save is never silent, naming the field when it has no inline
      // label to show the error next to.
      const [first] = configErrors
      const [topKey] = first.path.split('.')
      const rendered =
        configSchema?.properties?.[topKey] !== undefined &&
        !hiddenKeys.has(topKey)
      toast.error(rendered ? first.message : `${first.path}: ${first.message}`)
      return
    }
    const next: ProviderConfig = {
      ...provider,
      name: data.name,
      configValues,
      allowLocalOrigins: data.allowLocalOrigins,
    }
    await onSubmit(next)
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
          error={!!errors.name}
          helperText={errors.name?.message}
          {...register('name', { required: true })}
          fullWidth
          required
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
        {isBuiltin ? null : <LocalOriginsToggle />}
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

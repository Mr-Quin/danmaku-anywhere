import type { ConfigSchema } from '@mr-quin/dango'
import { Box, CircularProgress, Stack, TextField } from '@mui/material'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { useManifestSpec } from '../../hooks/useManifestSpec'
import { FormActions } from './FormActions'
import { SchemaObjectFields } from './SchemaFields'
import { buildDefaultValues } from './schemaForm'
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

  const methods = useForm<FormValues>({
    defaultValues: {
      name: provider.name,
      config: buildDefaultValues(configSchema, provider.configValues),
    },
  })

  const {
    handleSubmit,
    register,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = methods

  const handleFormSubmit = handleSubmit(async (data) => {
    const next: ProviderConfig = {
      ...provider,
      name: data.name,
      configValues: { ...provider.configValues, ...data.config },
    }
    await onSubmit(next)
  })

  const handleReset = () => {
    reset()
    onReset?.()
  }

  return (
    <FormProvider {...methods}>
      <Stack
        component="form"
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
        {configSchema ? (
          <SchemaObjectFields schema={configSchema} path="config" />
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
  const { isLoading, data } = useManifestSpec(props.provider.manifestId)

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return <ConfigForm {...props} configSchema={data?.configSchema} />
}

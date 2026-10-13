import type { ConfigSchema } from '@mr-quin/dango'
import { Remove } from '@mui/icons-material'
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormHelperText,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Controller, useFieldArray, useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  buildDefaultValues,
  fieldIssueMessage,
  getFieldKind,
  getObjectFields,
  getSelectOptions,
  toNumberOrUndefined,
} from './schemaForm'

interface SchemaFieldProps {
  name: string
  schema: ConfigSchema
  required?: boolean
  readOnly?: boolean
}

function fieldLabel(name: string, schema: ConfigSchema): string {
  if (typeof schema.title === 'string' && schema.title.length > 0) {
    return schema.title
  }
  const leaf = name.split('.').pop() ?? name
  return leaf
}

export function SchemaObjectFields({
  schema,
  path,
  readOnly = false,
  hiddenKeys,
}: {
  schema: ConfigSchema
  path: string
  readOnly?: boolean
  hiddenKeys?: ReadonlySet<string>
}) {
  const fields = getObjectFields(schema).filter(
    (field) => !hiddenKeys?.has(field.key)
  )
  return (
    <>
      {fields.map((field) => (
        <SchemaField
          key={field.key}
          name={`${path}.${field.key}`}
          schema={field.schema}
          required={field.required}
          readOnly={readOnly}
        />
      ))}
    </>
  )
}

function ScalarField({ name, schema, required, readOnly }: SchemaFieldProps) {
  const { t } = useTranslation()
  const { control } = useFormContext()
  const kind = getFieldKind(schema)
  return (
    <Controller
      name={name}
      control={control}
      rules={{
        required: required
          ? t('providers.editor.validation.required', 'This field is required')
          : false,
        validate: (value) => fieldIssueMessage(schema, value) ?? true,
      }}
      render={({ field: { ref, onChange, value, ...field }, fieldState }) => (
        <TextField
          {...field}
          value={value ?? ''}
          onChange={(e) =>
            onChange(
              kind === 'number'
                ? toNumberOrUndefined(e.target.value)
                : e.target.value
            )
          }
          inputRef={ref}
          label={fieldLabel(name, schema)}
          size="small"
          type={kind === 'number' ? 'number' : 'text'}
          required={required}
          error={!!fieldState.error}
          helperText={fieldState.error?.message || schema.description}
          slotProps={{ input: { readOnly } }}
          fullWidth
        />
      )}
    />
  )
}

function SelectField({ name, schema, required, readOnly }: SchemaFieldProps) {
  const { t } = useTranslation()
  const { control } = useFormContext()
  const options = getSelectOptions(schema)
  return (
    <Controller
      name={name}
      control={control}
      rules={{
        required: required
          ? t('providers.editor.validation.required', 'This field is required')
          : false,
      }}
      render={({ field: { ref, value, ...field }, fieldState }) => (
        <TextField
          {...field}
          value={value ?? ''}
          label={fieldLabel(name, schema)}
          size="small"
          select
          required={required}
          error={!!fieldState.error}
          inputRef={ref}
          helperText={fieldState.error?.message || schema.description}
          slotProps={{ input: { readOnly } }}
          fullWidth
        >
          {options.map((option) => (
            <MenuItem key={String(option.value)} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  )
}

function BooleanField({ name, schema, readOnly }: SchemaFieldProps) {
  const { control } = useFormContext()
  return (
    <Box sx={{ width: '100%' }}>
      <FormControlLabel
        control={
          <Controller
            name={name}
            control={control}
            render={({ field: { value, ref, ...field } }) => (
              <Checkbox
                {...field}
                slotProps={{ input: { ref } }}
                checked={!!value}
                disabled={readOnly}
              />
            )}
          />
        }
        label={fieldLabel(name, schema)}
        sx={{ color: 'text.secondary' }}
      />
      {schema.description ? (
        <FormHelperText sx={{ mt: 0 }}>{schema.description}</FormHelperText>
      ) : null}
    </Box>
  )
}

function ObjectField({ name, schema, readOnly }: SchemaFieldProps) {
  return (
    <Box sx={{ width: '100%' }}>
      <Typography sx={{ mb: schema.description ? 0 : 1 }}>
        {fieldLabel(name, schema)}
      </Typography>
      {schema.description ? (
        <FormHelperText sx={{ mt: 0, mb: 1 }}>
          {schema.description}
        </FormHelperText>
      ) : null}
      <Stack spacing={2}>
        <SchemaObjectFields schema={schema} path={name} readOnly={readOnly} />
      </Stack>
    </Box>
  )
}

function ArrayField({ name, schema, readOnly }: SchemaFieldProps) {
  const { t } = useTranslation()
  const { control } = useFormContext()
  const { fields, append, remove } = useFieldArray({ control, name })
  const itemSchema = schema.items

  if (!itemSchema) {
    return null
  }

  const isObjectItem = getFieldKind(itemSchema) === 'object'
  const appendEmptyItem = () => {
    append(
      isObjectItem
        ? buildDefaultValues(itemSchema, {})
        : (itemSchema.default ?? '')
    )
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Typography sx={{ mb: 1 }}>{fieldLabel(name, schema)}</Typography>
      <Stack spacing={2}>
        {fields.map((field, index) => (
          <Stack
            key={field.id}
            direction="row"
            spacing={1}
            sx={{ alignItems: 'flex-start' }}
          >
            {readOnly ? null : (
              <IconButton
                onClick={() => remove(index)}
                size="small"
                aria-label={t('common.delete', 'Delete')}
              >
                <Remove />
              </IconButton>
            )}
            <Stack spacing={1} sx={{ flex: 1 }}>
              {isObjectItem ? (
                <SchemaObjectFields
                  schema={itemSchema}
                  path={`${name}.${index}`}
                  readOnly={readOnly}
                />
              ) : (
                <SchemaField
                  name={`${name}.${index}`}
                  schema={itemSchema}
                  readOnly={readOnly}
                />
              )}
            </Stack>
          </Stack>
        ))}
        {readOnly ? null : (
          <Button
            variant="outlined"
            size="small"
            onClick={appendEmptyItem}
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('providers.editor.addItem', 'Add')}
          </Button>
        )}
      </Stack>
    </Box>
  )
}

export function SchemaField(props: SchemaFieldProps) {
  switch (getFieldKind(props.schema)) {
    case 'select':
      return <SelectField {...props} />
    case 'boolean':
      return <BooleanField {...props} />
    case 'object':
      return <ObjectField {...props} />
    case 'array':
      return <ArrayField {...props} />
    case 'number':
    case 'text':
      return <ScalarField {...props} />
    default:
      return null
  }
}

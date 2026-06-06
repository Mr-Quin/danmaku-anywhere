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
import { buildDefaultValues, getFieldKind, getObjectFields } from './schemaForm'

interface SchemaFieldProps {
  name: string
  schema: ConfigSchema
}

// Empty/invalid number inputs become undefined rather than NaN, which would
// otherwise serialize to null when merged into configValues.
function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) {
    return undefined
  }
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
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
}: {
  schema: ConfigSchema
  path: string
}) {
  const fields = getObjectFields(schema)
  return (
    <>
      {fields.map((field) => (
        <SchemaField
          key={field.key}
          name={`${path}.${field.key}`}
          schema={field.schema}
        />
      ))}
    </>
  )
}

function ScalarField({ name, schema }: SchemaFieldProps) {
  const { register } = useFormContext()
  const kind = getFieldKind(schema)
  return (
    <TextField
      label={fieldLabel(name, schema)}
      size="small"
      helperText={schema.description}
      {...register(
        name,
        kind === 'number' ? { setValueAs: toNumberOrUndefined } : {}
      )}
      type={kind === 'number' ? 'number' : 'text'}
      fullWidth
    />
  )
}

function SelectField({ name, schema }: SchemaFieldProps) {
  const { control } = useFormContext()
  const options = schema.enum ?? []
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { ref, ...field } }) => (
        <TextField
          {...field}
          label={fieldLabel(name, schema)}
          size="small"
          select
          inputRef={ref}
          helperText={schema.description}
          fullWidth
        >
          {options.map((option) => (
            <MenuItem key={String(option)} value={option as string | number}>
              {String(option)}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  )
}

function BooleanField({ name, schema }: SchemaFieldProps) {
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

function ObjectField({ name, schema }: SchemaFieldProps) {
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
        <SchemaObjectFields schema={schema} path={name} />
      </Stack>
    </Box>
  )
}

function ArrayField({ name, schema }: SchemaFieldProps) {
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
            <IconButton onClick={() => remove(index)} size="small">
              <Remove />
            </IconButton>
            <Stack spacing={1} sx={{ flex: 1 }}>
              {isObjectItem ? (
                <SchemaObjectFields
                  schema={itemSchema}
                  path={`${name}.${index}`}
                />
              ) : (
                <SchemaField name={`${name}.${index}`} schema={itemSchema} />
              )}
            </Stack>
          </Stack>
        ))}
        <Button
          variant="outlined"
          size="small"
          onClick={appendEmptyItem}
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('providers.editor.addItem', 'Add')}
        </Button>
      </Stack>
    </Box>
  )
}

export function SchemaField({ name, schema }: SchemaFieldProps) {
  switch (getFieldKind(schema)) {
    case 'select':
      return <SelectField name={name} schema={schema} />
    case 'boolean':
      return <BooleanField name={name} schema={schema} />
    case 'object':
      return <ObjectField name={name} schema={schema} />
    case 'array':
      return <ArrayField name={name} schema={schema} />
    case 'number':
    case 'text':
      return <ScalarField name={name} schema={schema} />
    default:
      return null
  }
}

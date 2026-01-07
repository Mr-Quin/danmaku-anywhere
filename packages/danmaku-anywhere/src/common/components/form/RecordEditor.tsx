import { Remove } from '@mui/icons-material'
import { Button, IconButton, Stack, TextField } from '@mui/material'
import { useEffect } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'

export interface RecordEditorProps {
  value?: Record<string, any>
  onChange: (value: Record<string, any>) => void
  keyLabel?: string
  valueLabel?: string
  addButtonLabel?: string
  valueType?: 'string' | 'json'
}

type Entry = {
  key: string
  value: string
}

type FormValues = {
  entries: Entry[]
}

export const RecordEditor = ({
  value = {},
  onChange,
  keyLabel = 'Key',
  valueLabel = 'Value',
  addButtonLabel = 'Add',
  valueType = 'string',
}: RecordEditorProps) => {
  // Convert Record to Array for internal form
  const toEntries = (record: Record<string, any>): Entry[] => {
    return Object.entries(record).map(([k, v]) => ({
      key: k,
      value: valueType === 'json' ? JSON.stringify(v, null, 2) : String(v),
    }))
  }

  const { control, watch } = useForm<FormValues>({
    defaultValues: {
      entries: toEntries(value),
    },
    mode: 'onChange',
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'entries',
  })

  // Watch for changes and propagate to parent
  useEffect(() => {
    const subscription = watch((data) => {
      const newRecord: Record<string, any> = {}
      data.entries?.forEach((entry) => {
        if (entry?.key) {
          if (valueType === 'json') {
            try {
              newRecord[entry.key] = JSON.parse(entry.value || 'null')
            } catch {
              // Invalid JSON
              newRecord[entry.key] = undefined
            }
          } else {
            newRecord[entry.key] = entry.value
          }
        }
      })
      onChange(newRecord)
    })
    return () => subscription.unsubscribe()
  }, [watch, onChange, valueType])

  return (
    <Stack spacing={2}>
      {fields.map((field, index) => (
        <Stack
          key={field.id}
          direction="row"
          spacing={1}
          alignItems="flex-start"
        >
          <IconButton onClick={() => remove(index)} size="small" tabIndex={-1}>
            <Remove />
          </IconButton>

          <Controller
            control={control}
            name={`entries.${index}.key`}
            render={({ field: f, fieldState }) => (
              <TextField
                {...f}
                label={keyLabel}
                size="small"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                fullWidth
                required
              />
            )}
            rules={{ required: 'Key is required' }}
          />

          <Controller
            control={control}
            name={`entries.${index}.value`}
            render={({ field: f, fieldState }) => (
              <TextField
                {...f}
                label={valueLabel}
                size="small"
                multiline={valueType === 'json'}
                minRows={valueType === 'json' ? 1 : undefined}
                error={!!fieldState.error}
                // TODO: Custom validation for JSON?
                helperText={fieldState.error?.message}
                fullWidth
              />
            )}
          />
        </Stack>
      ))}

      <Button
        variant="outlined"
        size="small"
        onClick={() => append({ key: '', value: '' })}
        sx={{ alignSelf: 'flex-start' }}
      >
        {addButtonLabel}
      </Button>
    </Stack>
  )
}

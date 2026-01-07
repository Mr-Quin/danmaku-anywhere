import { Remove } from '@mui/icons-material'
import {
  Button,
  IconButton,
  Stack,
  TextField,
  useEventCallback,
} from '@mui/material'
import { useEffect } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'

export interface RecordEditorProps {
  value?: Record<string, string>
  onChange: (value: Record<string, string>) => void
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

function toEntries(
  record: Record<string, string>,
  valueType: 'string' | 'json'
): Entry[] {
  return Object.entries(record).map(([k, v]) => ({
    key: k,
    value: valueType === 'json' ? JSON.stringify(v, null, 2) : String(v),
  }))
}

export const RecordEditor = ({
  value = {},
  onChange,
  keyLabel = 'Key',
  valueLabel = 'Value',
  addButtonLabel = 'Add',
  valueType = 'string',
}: RecordEditorProps) => {
  const { control, subscribe } = useForm<FormValues>({
    defaultValues: {
      entries: toEntries(value, valueType),
    },
    mode: 'onChange',
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'entries',
  })

  const stableOnChange = useEventCallback(onChange)

  useEffect(() => {
    const unsub = subscribe({
      formState: {
        values: true,
        isDirty: true,
      },
      callback: ({ values, isDirty }) => {
        if (!isDirty) {
          return
        }
        const newRecord: Record<string, string> = {}
        values.entries?.forEach((entry) => {
          if (entry.key) {
            if (valueType === 'json') {
              try {
                // invalid json will throw
                JSON.parse(entry.value)
                newRecord[entry.key] = entry.value
              } catch {
                // invalid json, noop
              }
            } else {
              newRecord[entry.key] = entry.value
            }
          }
        })
        stableOnChange(newRecord)
      },
    })

    return () => unsub()
  }, [subscribe, stableOnChange, valueType])

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

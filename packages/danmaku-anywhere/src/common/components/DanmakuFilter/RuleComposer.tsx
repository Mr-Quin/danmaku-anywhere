import { Box, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { AddButton } from './AddButton'
import { FilterTextField } from './FilterTextField'

type RuleComposerProps = {
  title?: string
  placeholder: string
  error?: string
  onAdd: (input: string) => boolean
  onErrorClear?: () => void
  initialValue?: string
}

export function RuleComposer({
  title,
  placeholder,
  error,
  onAdd,
  onErrorClear,
  initialValue,
}: RuleComposerProps) {
  const [value, setValue] = useState(initialValue ?? '')

  function handleSubmit() {
    const ok = onAdd(value)
    if (ok) {
      setValue('')
    }
  }

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault()
        handleSubmit()
      }}
    >
      {title && (
        <Typography
          variant="body2"
          gutterBottom
          sx={{
            fontWeight: 600,
          }}
        >
          {title}
        </Typography>
      )}
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'flex-start',
        }}
      >
        <FilterTextField
          placeholder={placeholder}
          fullWidth
          value={value}
          error={!!error}
          helperText={error || undefined}
          onChange={(e) => {
            onErrorClear?.()
            setValue(e.target.value)
          }}
        />
        <AddButton disabled={value.length === 0} />
      </Stack>
    </Box>
  )
}

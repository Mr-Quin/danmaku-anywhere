import { Box, Stack } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AddButton } from './AddButton'
import { FilterTextField } from './FilterTextField'

type PatternComposerProps = {
  error?: string
  onAdd: (label: string, pattern: string) => boolean
  onErrorClear?: () => void
}

export function PatternComposer({
  error,
  onAdd,
  onErrorClear,
}: PatternComposerProps) {
  const { t } = useTranslation()
  const [label, setLabel] = useState('')
  const [pattern, setPattern] = useState('')

  function handleSubmit() {
    const ok = onAdd(label, pattern)
    if (ok) {
      setLabel('')
      setPattern('')
    }
  }

  function handleChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      onErrorClear?.()
      setter(e.target.value)
    }
  }

  const canSubmit = label.trim().length > 0 && pattern.trim().length > 0

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault()
        handleSubmit()
      }}
    >
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <FilterTextField
          placeholder={t(
            'danmakuFilter.enterFilterPatternPlaceholder',
            'Text or /regex/'
          )}
          fullWidth
          value={pattern}
          error={!!error}
          helperText={error || undefined}
          onChange={handleChange(setPattern)}
        />
        <FilterTextField
          placeholder={t('danmakuFilter.labelPlaceholder', 'Label')}
          value={label}
          onChange={handleChange(setLabel)}
          sx={{ width: 96 }}
        />
        <AddButton disabled={!canSubmit} />
      </Stack>
    </Box>
  )
}

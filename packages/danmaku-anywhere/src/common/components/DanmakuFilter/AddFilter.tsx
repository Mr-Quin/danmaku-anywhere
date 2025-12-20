import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

type AddFilterProps = {
  onAdd: (pattern: string) => boolean
  isPending: boolean
  error?: string
  onErrorClear?: () => void
  initialFilter?: string
}

export const AddFilter = ({
  onAdd,
  isPending,
  error,
  onErrorClear,
  initialFilter,
}: AddFilterProps) => {
  const { t } = useTranslation()
  const [filterPattern, setFilterPattern] = useState(initialFilter || '')

  const handleAdd = () => {
    const success = onAdd(filterPattern)
    if (success) {
      setFilterPattern('')
    }
  }

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault()
        handleAdd()
      }}
    >
      <Typography variant="subtitle2" gutterBottom>
        {t('danmakuFilter.addFilterPattern', 'Add Filter Pattern')}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <TextField
          placeholder={t(
            'danmakuFilter.enterFilterPatternPlaceholder',
            'Enter Filter Pattern'
          )}
          fullWidth
          size="small"
          value={filterPattern}
          error={!!error}
          helperText={
            error ||
            t(
              'danmakuFilter.enterFilterPattern',
              "Enter filter pattern, regex starts and ends with '/'"
            )
          }
          onChange={(e) => {
            onErrorClear?.()
            setFilterPattern(e.target.value)
          }}
        />
        <Button
          variant="contained"
          type="submit"
          disabled={isPending || filterPattern.length === 0}
          sx={{ minWidth: 80, height: 40 }}
        >
          + {t('common.add', 'Add')}
        </Button>
      </Stack>
    </Box>
  )
}

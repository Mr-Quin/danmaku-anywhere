// Array Item Component for XPath Selectors
import { Colorize } from '@mui/icons-material'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  TextField,
} from '@mui/material'
import type { ReactNode } from 'react'
import type { FieldErrors } from 'react-hook-form'
import { Controller, useFieldArray, useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import type { IntegrationInput } from '@/common/options/integrationPolicyStore/schema'
import { withStopPropagation } from '@/common/utils/withStopPropagation'

export type ArrayFieldNames =
  | 'policy.title.selector'
  | 'policy.title.regex'
  | 'policy.episode.selector'
  | 'policy.episode.regex'
  | 'policy.season.selector'
  | 'policy.season.regex'
  | 'policy.episodeTitle.selector'
  | 'policy.episodeTitle.regex'

interface InputFieldArrayProps {
  name: ArrayFieldNames
  label: string
  getErrorMessage: (
    errors: FieldErrors<IntegrationInput>,
    index: number
  ) => string | undefined
  renderPrefix: (index: number) => ReactNode
  onOpenSelector?: (index: number) => void
}

export const InputFieldArray = ({
  name,
  label,
  getErrorMessage,
  renderPrefix,
  onOpenSelector,
}: InputFieldArrayProps) => {
  const { t } = useTranslation()

  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<IntegrationInput>()

  const { fields, append, remove } = useFieldArray({
    control,
    name,
  })

  // Watch the fields to trigger re-render when the fields change
  watch(name)

  return (
    <Box mb={2}>
      {fields.map((value, index) => {
        return (
          <Box display="flex" alignItems="center" mb={1} key={value.id}>
            {renderPrefix(index)}
            <Controller
              name={`${name}.${index}.value` as const}
              control={control}
              render={({ field }) => {
                return (
                  <TextField
                    variant="standard"
                    fullWidth
                    {...withStopPropagation()}
                    {...field}
                    error={!!getErrorMessage(errors, index)}
                    helperText={getErrorMessage(errors, index)}
                    label={`${label}[${index}]`}
                  />
                )
              }}
            />
            {onOpenSelector && (
              <IconButton onClick={() => onOpenSelector(index)}>
                {/*Eyedropper icon*/}
                <Colorize />
              </IconButton>
            )}
            <FormControlLabel
              control={
                <Controller
                  name={`${name}.${index}.quick` as const}
                  control={control}
                  defaultValue={false}
                  render={({ field: { value, ref, ...field } }) => {
                    return (
                      <Checkbox
                        {...field}
                        inputRef={ref}
                        checked={value}
                        color="primary"
                      />
                    )
                  }}
                />
              }
              label={t('integrationPolicyPage.editor.quick')}
              labelPlacement="top"
              slotProps={{
                typography: {
                  variant: 'caption',
                },
              }}
              sx={{ m: 0 }}
            />
            {
              // Only allow removing if there are more than 1 item
              fields.length > 1 && (
                <IconButton onClick={() => remove(index)}>
                  <RemoveIcon />
                </IconButton>
              )
            }
          </Box>
        )
      })}
      <Button
        variant="text"
        startIcon={<AddIcon />}
        onClick={() =>
          append({ value: '', quick: false }, { shouldFocus: true })
        }
      >
        {t('common.add')}
      </Button>
    </Box>
  )
}

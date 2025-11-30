import {
  Checkbox,
  Collapse,
  FormControl,
  FormControlLabel,
  FormHelperText,
  TextField,
} from '@mui/material'
import { Controller, useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { FancyTypography } from '@/common/components/FancyTypography'
import type { IntegrationInput } from '@/common/options/integrationPolicyStore/schema'
import { withStopPropagation } from '@/common/utils/withStopPropagation'
import type { ArrayFieldNames } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/components/InputFieldArray'
import { XPathEditor } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/components/XPathEditor'

interface IntegrationFormProps {
  onOpenSelector: (name: ArrayFieldNames, index: number) => void
}

export const IntegrationForm = ({ onOpenSelector }: IntegrationFormProps) => {
  const { t } = useTranslation()

  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<IntegrationInput>()

  const useAI = watch('policy.options.useAI')

  return (
    <>
      <Controller
        name="name"
        control={control}
        render={({ field }) => {
          return (
            <TextField
              label={t('integrationPolicyPage.editor.name', 'Name')}
              variant="standard"
              fullWidth
              required
              error={!!errors.name}
              helperText={errors.name?.message}
              {...withStopPropagation()}
              {...field}
              margin="none"
            />
          )
        }}
      />
      <FormControl>
        <FormControlLabel
          control={
            <Controller
              name="policy.options.useAI"
              control={control}
              render={({ field: { value, ref, ...field } }) => (
                <Checkbox
                  {...field}
                  inputRef={ref}
                  checked={value}
                  color="primary"
                />
              )}
            />
          }
          slots={{
            typography: FancyTypography,
          }}
          label={t(
            'integrationPolicyPage.editor.useAI',
            'Use AI (Experimental)'
          )}
        />
        <FormHelperText>
          {t(
            'integrationPolicyPage.editor.helper.useAI',
            'Try to use AI to parse show information. If parsing fails, try manual configuration.'
          )}
        </FormHelperText>
      </FormControl>
      <Collapse in={!useAI} unmountOnExit>
        <XPathEditor onOpenSelector={onOpenSelector} />
      </Collapse>
    </>
  )
}

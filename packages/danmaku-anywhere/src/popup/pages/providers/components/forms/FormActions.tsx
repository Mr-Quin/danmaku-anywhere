import {
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  Stack,
} from '@mui/material'
import type { Control } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'

interface FormActionsProps {
  control: Control<ProviderConfig>
  isEdit: boolean
  isSubmitting: boolean
  onReset: () => void
}

export const FormActions = ({
  control,
  isEdit,
  isSubmitting,
  onReset,
}: FormActionsProps) => {
  const { t } = useTranslation()

  return (
    <Stack direction="row" spacing={2} width={1} justifyContent="space-between">
      <FormControl>
        <FormControlLabel
          control={
            <Controller
              name="enabled"
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
          label={t('common.enable')}
        />
      </FormControl>
      <div>
        {isEdit && (
          <Button
            variant="outlined"
            onClick={onReset}
            disabled={isSubmitting}
            sx={{ mr: 2 }}
          >
            {t('common.reset')}
          </Button>
        )}
        <Button
          variant="contained"
          color="primary"
          type="submit"
          loading={isSubmitting}
        >
          {t('common.save')}
        </Button>
      </div>
    </Stack>
  )
}

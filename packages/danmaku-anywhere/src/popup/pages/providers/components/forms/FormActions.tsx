import { Button, Stack } from '@mui/material'
import { useTranslation } from 'react-i18next'

interface FormActionsProps {
  isEdit: boolean
  isSubmitting: boolean
  disableReset?: boolean
  onReset: () => void
}

export const FormActions = ({
  isEdit,
  isSubmitting,
  disableReset = false,
  onReset,
}: FormActionsProps) => {
  const { t } = useTranslation()

  return (
    <Stack direction="row" spacing={2} width={1} justifyContent="flex-end">
      {isEdit && (
        <Button
          variant="outlined"
          onClick={onReset}
          disabled={isSubmitting || disableReset}
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
    </Stack>
  )
}

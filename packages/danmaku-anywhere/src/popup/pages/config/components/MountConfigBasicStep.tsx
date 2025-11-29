import {
  AddCircleOutline,
  ExpandMore,
  RemoveCircleOutline,
} from '@mui/icons-material'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Collapse,
  FormHelperText,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form'
import { useFieldArray } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { validateOrigin } from '@/common/utils/utils'
import type { MountConfigForm } from './types'

interface MountConfigBasicStepProps {
  control: Control<MountConfigForm>
  register: UseFormRegister<MountConfigForm>
  errors: FieldErrors<MountConfigForm>
  isPermissive: boolean
}

export const MountConfigBasicStep = ({
  control,
  register,
  errors,
  isPermissive,
}: MountConfigBasicStepProps) => {
  const { t } = useTranslation()
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'patterns',
  })

  const addPatternField = () => {
    append({ value: '' })
  }

  const removePatternField = (index: number) => {
    remove(index)
  }

  return (
    <Stack spacing={2} alignItems="flex-start">
      <Collapse in={isPermissive} sx={{ width: 1 }}>
        <Alert severity="warning">{t('configPage.editor.tooPermissive')}</Alert>
      </Collapse>
      <TextField
        label={t('configPage.editor.name')}
        size="small"
        error={!!errors.name}
        {...register('name', { required: true })}
        fullWidth
        required
      />

      <Typography variant="body2" color="textSecondary">
        {t('configPage.editor.urlPatterns')}
      </Typography>
      <FormHelperText>
        {t('configPage.editor.helper.urlPattern')}
      </FormHelperText>
      {fields.map((field, index, arr) => (
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          key={field.id}
          sx={{ alignSelf: 'stretch' }}
        >
          <TextField
            label={`${t('configPage.editor.pattern')} ${index + 1}`}
            error={!!errors.patterns?.[index]}
            helperText={errors.patterns?.[index]?.value?.message}
            size="small"
            {...register(`patterns.${index}.value`, {
              validate: validateOrigin,
              required: 'Pattern is required',
            })}
            fullWidth
            required
          />
          {arr.length > 1 ? (
            <Box>
              <IconButton onClick={() => removePatternField(index)}>
                <RemoveCircleOutline />
              </IconButton>
            </Box>
          ) : (
            <Box />
          )}
        </Stack>
      ))}
      <Button onClick={addPatternField} startIcon={<AddCircleOutline />}>
        {t('configPage.editor.pattern.add')}
      </Button>

      <Accordion
        disableGutters
        elevation={0}
        sx={{
          width: '100%',
          '&:before': { display: 'none' },
          border: '1px solid rgba(0, 0, 0, 0.12)',
          borderRadius: 1,
          mt: 2,
        }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="body2" color="textSecondary">
            Advanced
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 1 }}>
          <TextField
            label={t('configPage.editor.mediaQuery')}
            size="small"
            error={!!errors.mediaQuery}
            helperText={
              errors.mediaQuery
                ? errors.mediaQuery?.message
                : t('configPage.editor.helper.mediaQuery')
            }
            {...register('mediaQuery', { required: true })}
            fullWidth
            required
          />
        </AccordionDetails>
      </Accordion>
    </Stack>
  )
}

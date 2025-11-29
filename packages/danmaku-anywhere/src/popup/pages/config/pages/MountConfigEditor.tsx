import {
  AddCircleOutline,
  AutoAwesome,
  Build,
  RemoveCircleOutline,
  TouchApp,
} from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Checkbox,
  Collapse,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  Radio,
  RadioGroup,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { isPatternPermissive } from '@/common/options/mountConfig/isPermissive'
import type { MountConfigInput } from '@/common/options/mountConfig/schema'
import { useEditMountConfig } from '@/common/options/mountConfig/useMountConfig'
import { validateOrigin } from '@/common/utils/utils'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { useGoBack } from '@/popup/hooks/useGoBack'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { useStore } from '@/popup/store'

// react-hook-form does not allow primitive arrays, so we need to convert the array to an object
type MountConfigForm = Omit<MountConfigInput, 'patterns'> & {
  patterns: { value: string }[]
}

const emptyIntegrationValue = '@@NONE@@'

const toForm = (config: MountConfigInput): MountConfigForm => {
  return {
    ...config,
    patterns: config.patterns.map((value) => ({ value })),
    integration: config.integration ?? emptyIntegrationValue,
    mode: config.mode ?? 'manual',
  }
}

const fromForm = (form: MountConfigForm): MountConfigInput => {
  return {
    ...form,
    patterns: form.patterns.map(({ value }) => value),
    integration:
      form.integration === emptyIntegrationValue ? undefined : form.integration,
  }
}

interface MountConfigEditorProps {
  mode: 'add' | 'edit'
}

export const MountConfigEditor = ({
  mode,
}: MountConfigEditorProps): ReactElement => {
  const { t } = useTranslation()
  const { update, create } = useEditMountConfig()
  const [isPermissive, setIsPermissive] = useState(false)
  const goBack = useGoBack()

  const isEdit = mode === 'edit'
  const { editingConfig: config } = useStore.use.config()

  const [activeStep, setActiveStep] = useState(0)

  const {
    handleSubmit,
    control,
    register,
    subscribe,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MountConfigForm>({
    values: toForm(config),
    mode: 'onChange',
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'patterns',
  })

  const toast = useToast.use.toast()

  useEffect(() => {
    return subscribe({
      formState: {
        values: true,
      },
      callback: ({ values }) => {
        if (
          values.patterns.some((p) => {
            return isPatternPermissive(p.value)
          })
        ) {
          setIsPermissive(true)
        } else {
          setIsPermissive(false)
        }
      },
    })
  }, [subscribe, setIsPermissive])

  const addPatternField = () => {
    append({ value: '' })
  }

  const removePatternField = (index: number) => {
    remove(index)
  }

  const handleNext = async () => {
    const isValid = await trigger(['name', 'mediaQuery', 'patterns', 'enabled'])
    if (isValid) {
      // Check if at least one pattern is added and valid
      const currentPatterns = watch('patterns')
      if (currentPatterns.length === 0) {
        toast.error('At least one pattern is required')
        return
      }
      // Also check pattern values manually if needed, but trigger should handle validation defined in register
      setActiveStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    setActiveStep((prev) => prev - 1)
  }

  const handleSave = async (data: MountConfigForm) => {
    if (data.patterns.length === 0) {
      toast.error('At least one pattern is required')
      return
    }

    const toUpdate = fromForm(data)

    // Logic for mode
    if (toUpdate.mode === 'custom') {
      // If custom is selected, we keep the integration if it exists (from previous editing), or undefined if new
      // The user flow says: "by selecting custom selector, the user is linking a integration policy (that is not created yet)"
      // But if they are editing an existing config that already has an integration, we should probably keep it?
      // The prompt says: "if user selects custom selector, then when they go to a matched website, we'll show an indicator... using the exisitng integration policy editor... which will finally create the policy"
      // This implies for new setup, integration should be undefined.
      // If switching from another mode to custom, integration should probably be cleared?
      // Let's assume if integration is not set, it remains undefined.
    } else {
      // For manual and ai, we don't need integration policy (unless AI uses it for something else, but "lifts the AI flag" implies config handles it)
      toUpdate.integration = undefined
    }

    if (isEdit && config.id) {
      return update.mutate(
        { id: config.id, config: toUpdate },
        {
          onSuccess: () => {
            toast.success(t('configs.alert.updated'))
            goBack()
          },
          onError: (error) => {
            toast.error(error.message)
          },
        }
      )
    }
    return create.mutate(toUpdate, {
      onSuccess: () => {
        toast.success(t('configs.alert.created'))
        goBack()
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })
  }

  const renderStep1 = () => (
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
    </Stack>
  )

  const renderStep2 = () => (
    <Stack spacing={3}>
      <Typography variant="h6">Select Automation Method</Typography>
      <Controller
        name="mode"
        control={control}
        render={({ field }) => (
          <RadioGroup {...field} row={false}>
            <Stack spacing={2}>
              <Card
                variant={field.value === 'manual' ? 'outlined' : 'outlined'}
                sx={{
                  borderColor:
                    field.value === 'manual' ? 'primary.main' : undefined,
                  borderWidth: field.value === 'manual' ? 2 : 1,
                }}
              >
                <CardActionArea onClick={() => field.onChange('manual')}>
                  <CardContent
                    sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                  >
                    <Radio checked={field.value === 'manual'} value="manual" />
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TouchApp />
                        <Typography variant="subtitle1" fontWeight="bold">
                          No - Manual only
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        I'll select danmaku manually from library or search
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>

              <Card
                variant={field.value === 'ai' ? 'outlined' : 'outlined'}
                sx={{
                  borderColor:
                    field.value === 'ai' ? 'primary.main' : undefined,
                  borderWidth: field.value === 'ai' ? 2 : 1,
                }}
              >
                <CardActionArea onClick={() => field.onChange('ai')}>
                  <CardContent
                    sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                  >
                    <Radio checked={field.value === 'ai'} value="ai" />
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <AutoAwesome color="secondary" />
                        <Typography variant="subtitle1" fontWeight="bold">
                          Yes - Use AI
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Automatically detect video info using AI
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>

              <Card
                variant={field.value === 'custom' ? 'outlined' : 'outlined'}
                sx={{
                  borderColor:
                    field.value === 'custom' ? 'primary.main' : undefined,
                  borderWidth: field.value === 'custom' ? 2 : 1,
                }}
              >
                <CardActionArea onClick={() => field.onChange('custom')}>
                  <CardContent
                    sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                  >
                    <Radio checked={field.value === 'custom'} value="custom" />
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Build color="primary" />
                        <Typography variant="subtitle1" fontWeight="bold">
                          Yes - Custom selectors
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Use element picker on the site (requires visiting site)
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Stack>
          </RadioGroup>
        )}
      />

      {watch('mode') === 'custom' && (
        <Alert severity="warning">
          You'll need to visit this site after saving to complete the setup
          using the on-page dropper tool.
        </Alert>
      )}

      <Stack
        direction="row"
        spacing={2}
        justifyContent="space-between"
        sx={{ mt: 2 }}
      >
        <Button onClick={handleBack}>Back</Button>
        <Button
          variant="contained"
          onClick={handleSubmit(handleSave)}
          loading={isSubmitting}
        >
          {t('common.save')}
        </Button>
      </Stack>
    </Stack>
  )

  return (
    <OptionsPageLayout direction="left">
      <OptionsPageToolBar
        title={
          isEdit
            ? t('configPage.editor.title.edit', { name: config.name })
            : t('configPage.editor.title.create')
        }
      />
      <Box p={2}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          <Step>
            <StepLabel>Basic Info</StepLabel>
          </Step>
          <Step>
            <StepLabel>Automation</StepLabel>
          </Step>
        </Stepper>

        <Box component="form">
          {activeStep === 0 && (
            <>
              {renderStep1()}
              <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                <Button variant="contained" onClick={handleNext}>
                  Next
                </Button>
              </Stack>
            </>
          )}
          {activeStep === 1 && renderStep2()}
        </Box>
      </Box>
    </OptionsPageLayout>
  )
}

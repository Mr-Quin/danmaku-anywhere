import { Box, Button, Divider, Step, StepButton, Stepper } from '@mui/material'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { MountConfigAiSettingsForm } from '@/common/options/mountConfig/components/MountConfigAiSettingsForm'
import { isPatternPermissive } from '@/common/options/mountConfig/isPermissive'
import type { MountConfigInput } from '@/common/options/mountConfig/schema'
import { useEditMountConfig } from '@/common/options/mountConfig/useMountConfig'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { useGoBack } from '@/popup/hooks/useGoBack'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { useStore } from '@/popup/store'
import { MountConfigAutomationStep } from '../components/MountConfigAutomationStep'
import { MountConfigBasicStep } from '../components/MountConfigBasicStep'
import type { MountConfigForm } from '../components/types'
import { EMPTY_INTEGRATION_VALUE } from '../emptyIntegrationValue.constant'

const toForm = (config: MountConfigInput): MountConfigForm => {
  return {
    ...config,
    patterns: config.patterns.map((value) => ({ value })),
    integration: config.integration ?? EMPTY_INTEGRATION_VALUE,
    mode: config.mode ?? 'manual',
    ai: config.ai ?? { providerId: 'built-in' },
  }
}

const fromForm = (form: MountConfigForm): MountConfigInput => {
  return {
    ...form,
    patterns: form.patterns.map(({ value }) => value),
    integration:
      form.integration === EMPTY_INTEGRATION_VALUE
        ? undefined
        : form.integration,
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
    formState: { errors, isSubmitting, isValid },
  } = useForm<MountConfigForm>({
    values: toForm(config),
    mode: 'onChange',
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

  const handleNext = async () => {
    const isValid = await trigger(['name', 'mediaQuery', 'patterns'])
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

  const handleStep = (step: number) => {
    setActiveStep(step)
  }
  const handleSave = async (data: MountConfigForm) => {
    if (data.patterns.length === 0) {
      toast.error('At least one pattern is required')
      return
    }

    const toUpdate = fromForm(data)

    if (isEdit && config.id) {
      return update.mutate(
        { id: config.id, config: toUpdate },
        {
          onSuccess: () => {
            toast.success(t('configs.alert.updated', 'Config Updated'))
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
        toast.success(t('configs.alert.created', 'Config Created'))
        goBack()
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })
  }

  const automationMode = watch('mode')
  const isAiMode = automationMode === 'ai'

  const handleSmartNext = async () => {
    if (activeStep === 0) {
      handleNext()
    } else if (activeStep === 1) {
      if (isAiMode) {
        setActiveStep(2)
      } else {
        await handleSubmit(handleSave)()
      }
    }
  }

  return (
    <OptionsPageLayout direction="up">
      <OptionsPageToolBar
        title={
          isEdit
            ? t('configPage.editor.title.edit', 'Edit {{name}}', {
                name: config.name,
              })
            : t('configPage.editor.title.create', 'Add Config')
        }
      />
      <Box p={2}>
        <Stepper activeStep={activeStep}>
          <Step>
            <StepButton onClick={() => handleStep(0)}>
              {t('configPage.editor.step.basicInfo', 'Basic Info')}
            </StepButton>
          </Step>
          <Step>
            <StepButton onClick={() => handleStep(1)}>
              {t('configPage.editor.step.automation', 'Automation')}
            </StepButton>
          </Step>
          {isAiMode && (
            <Step>
              <StepButton onClick={() => handleStep(2)}>
                {t('configPage.editor.step.ai', 'AI Configuration')}
              </StepButton>
            </Step>
          )}
        </Stepper>
        <Divider sx={{ my: 1 }} />

        <Box component="form">
          {activeStep === 0 && (
            <>
              <MountConfigBasicStep
                control={control}
                register={register}
                errors={errors}
                isPermissive={isPermissive}
              />
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  fullWidth
                  disabled={!isValid}
                >
                  {t('common.next', 'Next')}
                </Button>
              </Box>
            </>
          )}
          {activeStep === 1 && (
            <>
              <MountConfigAutomationStep
                control={control}
                watch={watch}
                isPermissive={isPermissive}
              />
              <Button
                variant="contained"
                onClick={handleSmartNext}
                loading={isSubmitting}
                fullWidth
                sx={{ mt: 2 }}
                disabled={!isValid}
              >
                {isAiMode ? t('common.next', 'Next') : t('common.save', 'Save')}
              </Button>
            </>
          )}
          {activeStep === 2 && isAiMode && (
            <>
              <Controller
                control={control}
                name="ai"
                render={({ field }) => (
                  <MountConfigAiSettingsForm
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <Button
                variant="contained"
                onClick={handleSubmit(handleSave)}
                loading={isSubmitting}
                fullWidth
                sx={{ mt: 2 }}
                disabled={!isValid}
              >
                {t('common.save', 'Save')}
              </Button>
            </>
          )}
        </Box>
      </Box>
    </OptionsPageLayout>
  )
}

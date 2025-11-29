import { Box, Button, Stack, Step, StepLabel, Stepper } from '@mui/material'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
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
        <Stepper activeStep={activeStep} sx={{ mb: 1 }}>
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
              <MountConfigBasicStep
                control={control}
                register={register}
                errors={errors}
                isPermissive={isPermissive}
              />
              <Box sx={{ mt: 2 }}>
                <Button variant="contained" onClick={handleNext} fullWidth>
                  Next
                </Button>
              </Box>
            </>
          )}
          {activeStep === 1 && (
            <>
              <MountConfigAutomationStep control={control} watch={watch} />
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
            </>
          )}
        </Box>
      </Box>
    </OptionsPageLayout>
  )
}

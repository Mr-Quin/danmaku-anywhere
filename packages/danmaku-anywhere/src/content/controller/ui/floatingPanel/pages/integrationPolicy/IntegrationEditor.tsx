import { zodResolver } from '@hookform/resolvers/zod'
import { AutoAwesome, OpenInNew } from '@mui/icons-material'
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { useToast } from '@/common/components/Toast/toastStore'
import type {
  Integration,
  IntegrationInput,
} from '@/common/options/integrationPolicyStore/schema'
import {
  createIntegrationInput,
  zIntegration,
} from '@/common/options/integrationPolicyStore/schema'
import { useIntegrationPolicyStore } from '@/common/options/integrationPolicyStore/useIntegrationPolicyStore'
import { docsLink, getElementByXpath } from '@/common/utils/utils'
import { useActiveConfig } from '@/content/controller/common/hooks/useActiveConfig'
import { useActiveIntegration } from '@/content/controller/common/hooks/useActiveIntegration'
import { useStore } from '@/content/controller/store/store'
import { ElementSelector } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/components/ElementSelector'
import { IntegrationLivePreview } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/components/IntegrationLivePreview'
import { IntegrationSection } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/components/IntegrationSection'
import { ValidationIcon } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/components/ValidationIcon'

type ArrayFieldNames =
  | 'policy.title.selector'
  | 'policy.title.regex'
  | 'policy.episode.selector'
  | 'policy.episode.regex'
  | 'policy.season.selector'
  | 'policy.season.regex'
  | 'policy.episodeTitle.selector'
  | 'policy.episodeTitle.regex'

export const IntegrationEditor = (): ReactElement => {
  const { t } = useTranslation()
  const activePolicy = useActiveIntegration()
  const activeConfig = useActiveConfig()
  const { update, add } = useIntegrationPolicyStore()

  const [showSelector, setShowSelector] = useState(false)
  const [selectedField, setSelectedField] = useState<{
    name: ArrayFieldNames
    index: number
  }>()

  const isEdit = !!activePolicy

  // Save form data to store so that it can be restored when the user comes back
  const { toggleEditor } = useStore.use.integrationForm()

  const defaultValues =
    activePolicy ?? createIntegrationInput(activeConfig?.name ?? '')

  const form = useForm<IntegrationInput, unknown, Integration>({
    defaultValues,
    resolver: zodResolver(zIntegration),
    mode: 'onChange',
  })

  const {
    handleSubmit,
    getValues,
    reset,
    control,
    formState: { isSubmitting },
  } = form

  useEffect(() => {
    if (activePolicy) {
      reset(activePolicy)
    }
  }, [activePolicy, reset])

  const toast = useToast.use.toast()

  const { mutate: saveForm } = useMutation({
    mutationFn: async (data: Integration) => {
      if (activePolicy) {
        return update(activePolicy.id, data)
      }
      if (activeConfig) {
        return add(
          {
            ...data,
            id: (data.id ?? crypto.randomUUID()) as string,
          } as Integration,
          activeConfig.id
        )
      }
      throw new Error('No active configuration or policy found for mutation.')
    },
    onSuccess: () => {
      if (isEdit) {
        toast.success(t('configs.alert.updated'))
      } else {
        toast.success(t('configs.alert.created'))
      }
      toggleEditor()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleOpenSelector = (name: ArrayFieldNames, index: number) => {
    setShowSelector(true)
    setSelectedField({ name, index })
  }

  const handleSelectElement = (xPath: string) => {
    if (!selectedField) return
    const { name, index } = selectedField
    const values = getValues(name)
    const newValues = values.toSpliced(index, 1, { value: xPath, quick: false })
    form.setValue(name, newValues)
  }

  const renderXPathValidation = (name: ArrayFieldNames) => {
    const values = getValues(name)

    return (index: number) => {
      const xPath = values[index]
      const element = getElementByXpath(xPath.value)

      return (
        <ValidationIcon
          state={xPath ? (element ? 'success' : 'error') : 'disabled'}
          tooltip={element?.textContent ?? ''}
        />
      )
    }
  }

  return (
    <>
      <TabLayout>
        <form
          onSubmit={handleSubmit((data) => {
            saveForm(data)
          })}
        >
          <FormProvider {...form}>
            <TabToolbar
              title="Configure Integration"
              showBackButton
              onGoBack={() => toggleEditor()}
            >
              <div>
                <Button
                  variant="text"
                  component="a"
                  href={docsLink('docs/integration-policy/')}
                  target="_blank"
                >
                  {t('common.docs')}
                  <OpenInNew fontSize="inherit" color="primary" />
                </Button>
              </div>
            </TabToolbar>
            <Box p={2} pb={10}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Teach the extension how to extract video info from this page
              </Typography>
              <IntegrationLivePreview />

              <Stack spacing={2}>
                <IntegrationSection
                  name="policy.title.selector"
                  label="Video Title"
                  getErrorMessage={(errors, i) =>
                    errors.policy?.title?.selector?.[i]?.message
                  }
                  renderPrefix={renderXPathValidation('policy.title.selector')}
                  onOpenSelector={(index) =>
                    handleOpenSelector('policy.title.selector', index)
                  }
                />

                <IntegrationSection
                  name="policy.season.selector"
                  label="Season Number"
                  getErrorMessage={(errors, i) =>
                    errors.policy?.season?.selector?.[i]?.message
                  }
                  renderPrefix={renderXPathValidation('policy.season.selector')}
                  onOpenSelector={(index) =>
                    handleOpenSelector('policy.season.selector', index)
                  }
                />

                <IntegrationSection
                  name="policy.episode.selector"
                  label="Episode Number"
                  getErrorMessage={(errors, i) =>
                    errors.policy?.episode?.selector?.[i]?.message
                  }
                  renderPrefix={renderXPathValidation(
                    'policy.episode.selector'
                  )}
                  onOpenSelector={(index) =>
                    handleOpenSelector('policy.episode.selector', index)
                  }
                />
              </Stack>

              <Box
                sx={{
                  position: 'fixed',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  p: 2,
                  bgcolor: 'background.paper',
                  borderTop: 1,
                  borderColor: 'divider',
                  zIndex: 1,
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={2}
                >
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
                            color="secondary"
                          />
                        )}
                      />
                    }
                    label={
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <AutoAwesome color="secondary" fontSize="small" />
                        <Typography variant="body2">
                          AI Auto-configure (Beta)
                        </Typography>
                      </Stack>
                    }
                  />
                </Stack>
                <Stack direction="row" spacing={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => toggleEditor()}
                  >
                    Cancel
                  </Button>
                  <Button
                    fullWidth
                    type="submit"
                    variant="contained"
                    color="secondary"
                    loading={isSubmitting}
                  >
                    Save Config
                  </Button>
                </Stack>
              </Box>
            </Box>
          </FormProvider>
        </form>
      </TabLayout>

      <ElementSelector
        enable={showSelector}
        onExit={() => setShowSelector(false)}
        onSelect={handleSelectElement}
      />
    </>
  )
}

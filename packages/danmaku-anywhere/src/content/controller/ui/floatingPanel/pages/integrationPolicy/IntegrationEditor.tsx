import { zodResolver } from '@hookform/resolvers/zod'
import { OpenInNew } from '@mui/icons-material'
import { Box, Button, Stack, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
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
import type { IntegrationArrayFieldNames } from './types'

export const IntegrationEditor = (): ReactElement => {
  const { t } = useTranslation()
  const activePolicy = useActiveIntegration()
  const activeConfig = useActiveConfig()
  const { update, add } = useIntegrationPolicyStore()

  const [showSelector, setShowSelector] = useState(false)
  const [onSelectCallback, setOnSelectCallback] =
    useState<(xPath: string) => void>()

  const { setIsPicking } = useStore.use.integrationForm()

  useEffect(() => {
    setIsPicking(showSelector)
  }, [showSelector, setIsPicking])

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

  const handleOpenSelector = (callback: (xPath: string) => void) => {
    setShowSelector(true)
    setOnSelectCallback(() => callback)
  }

  const handleSelectElement = (xPath: string) => {
    if (onSelectCallback) {
      onSelectCallback(xPath)
    }
    setShowSelector(false)
  }

  const renderXPathValidation = (name: IntegrationArrayFieldNames) => {
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
                  name="policy.title"
                  label="Video Title"
                  getErrorMessage={(errors, i) =>
                    errors.policy?.title?.selector?.[i]?.message
                  }
                  renderPrefix={renderXPathValidation('policy.title.selector')}
                  onOpenSelector={(callback) => handleOpenSelector(callback)}
                />

                <IntegrationSection
                  name="policy.season"
                  label="Season Number"
                  getErrorMessage={(errors, i) =>
                    errors.policy?.season?.selector?.[i]?.message
                  }
                  renderPrefix={renderXPathValidation('policy.season.selector')}
                  onOpenSelector={(callback) => handleOpenSelector(callback)}
                />

                <IntegrationSection
                  name="policy.episode"
                  label="Episode Number"
                  getErrorMessage={(errors, i) =>
                    errors.policy?.episode?.selector?.[i]?.message
                  }
                  renderPrefix={renderXPathValidation(
                    'policy.episode.selector'
                  )}
                  onOpenSelector={(callback) => handleOpenSelector(callback)}
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

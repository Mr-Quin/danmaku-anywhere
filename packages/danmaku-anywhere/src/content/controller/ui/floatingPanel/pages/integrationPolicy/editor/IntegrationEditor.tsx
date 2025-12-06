import { zodResolver } from '@hookform/resolvers/zod'
import { OpenInNew } from '@mui/icons-material'
import { Box, Button, Stack, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { OverlayLayout } from '@/common/components/layout/OverlayLayout'
import { ScrollBox } from '@/common/components/layout/ScrollBox'
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
import { docsLink } from '@/common/utils/utils'
import { useActiveConfig } from '@/content/controller/common/hooks/useActiveConfig'
import { useActiveIntegration } from '@/content/controller/common/hooks/useActiveIntegration'
import { useStore } from '@/content/controller/store/store'
import { IntegrationLivePreview } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/components/IntegrationLivePreview'
import { IntegrationSection } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/editor/components/IntegrationSection'
import { ElementSelector } from './components/elementSelector/ElementSelector'

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

  const { toggleEditor } = useStore.use.integrationForm()

  const defaultValues =
    activePolicy ?? createIntegrationInput(activeConfig?.name ?? '')

  const form = useForm<IntegrationInput, unknown, Integration>({
    defaultValues,
    resolver: zodResolver(zIntegration),
    mode: 'onChange',
  })

  const { handleSubmit, reset, formState } = form
  console.log(formState)
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
            id: data.id ?? crypto.randomUUID(),
          },
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

  return (
    <OverlayLayout>
      <TabLayout height="100%">
        <form
          onSubmit={handleSubmit((data) => {
            saveForm(data)
          })}
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
          <TabToolbar
            title={t(
              'configs.integrationPolicy.editor.title',
              'Configure Integration'
            )}
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
                {t('common.docs', 'Docs')}
                <OpenInNew fontSize="inherit" color="primary" />
              </Button>
            </div>
          </TabToolbar>

          <ScrollBox flexGrow={1} overflow="auto" minHeight={0}>
            <FormProvider {...form}>
              <Box p={2} pb={10}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  {t(
                    'configs.integrationPolicy.editor.description',
                    'Teach the extension how to extract video info from this page'
                  )}
                </Typography>
                <IntegrationLivePreview />

                <Stack spacing={2}>
                  <IntegrationSection
                    name="policy.title"
                    label={t(
                      'configs.integrationPolicy.editor.videoTitle',
                      'Video Title'
                    )}
                    getErrorMessage={(errors, i) =>
                      errors.policy?.title?.selector?.[i]?.message
                    }
                    onOpenSelector={(callback) => handleOpenSelector(callback)}
                  />

                  <IntegrationSection
                    name="policy.season"
                    label={t(
                      'configs.integrationPolicy.editor.seasonNumber',
                      'Season Number (Optional)'
                    )}
                    getErrorMessage={(errors, i) =>
                      errors.policy?.season?.selector?.[i]?.message
                    }
                    onOpenSelector={(callback) => handleOpenSelector(callback)}
                  />

                  <IntegrationSection
                    name="policy.episode"
                    label={t(
                      'configs.integrationPolicy.editor.episodeNumber',
                      'Episode Number (Optional)'
                    )}
                    getErrorMessage={(errors, i) =>
                      errors.policy?.episode?.selector?.[i]?.message
                    }
                    onOpenSelector={(callback) => handleOpenSelector(callback)}
                  />
                </Stack>
              </Box>
            </FormProvider>
          </ScrollBox>

          <Box
            sx={{
              p: 2,
              bgcolor: 'background.paper',
            }}
          >
            <Stack direction="row" spacing={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => toggleEditor()}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                fullWidth
                type="submit"
                variant="contained"
                color="primary"
                loading={formState.isSubmitting}
                disabled={
                  formState.isSubmitting ||
                  !formState.isValid ||
                  !formState.isDirty
                }
              >
                {t('common.save', 'Save')}
              </Button>
            </Stack>
          </Box>
        </form>
      </TabLayout>

      <ElementSelector
        enable={showSelector}
        onExit={() => setShowSelector(false)}
        onSelect={handleSelectElement}
      />
    </OverlayLayout>
  )
}

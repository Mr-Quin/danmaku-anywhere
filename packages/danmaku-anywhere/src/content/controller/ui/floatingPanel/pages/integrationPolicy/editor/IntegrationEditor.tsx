import { createIntegrationInput } from '@danmaku-anywhere/integration-policy'
import { zodResolver } from '@hookform/resolvers/zod'
import { OpenInNew } from '@mui/icons-material'
import { Box, Button, Stack } from '@mui/material'
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
import { zIntegration } from '@/common/options/integrationPolicyStore/schema'
import { useIntegrationPolicyStore } from '@/common/options/integrationPolicyStore/useIntegrationPolicyStore'
import { docsLink } from '@/common/utils/utils'
import { useActiveConfig } from '@/content/controller/common/context/useActiveConfig'
import { useActiveIntegration } from '@/content/controller/common/context/useActiveIntegration'
import { useStore } from '@/content/controller/store/store'
import { IntegrationSection } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/editor/components/IntegrationSection'
import { ElementSelector } from './components/elementSelector/ElementSelector'
import { IntegrationPreview } from './components/IntegrationPreview'

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
    activePolicy ?? createIntegrationInput(activeConfig.name)

  const form = useForm<IntegrationInput, unknown, Integration>({
    defaultValues,
    resolver: zodResolver(zIntegration),
    mode: 'onChange',
  })

  const { handleSubmit, reset, formState } = form

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
      return add(
        {
          ...data,
          id: data.id,
        },
        activeConfig.id
      )
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
              'integrationPolicyPage.editor.title',
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

          <IntegrationPreview control={form.control} />

          <ScrollBox flexGrow={1} overflow="auto" minHeight={0}>
            <FormProvider {...form}>
              <Box p={2}>
                <Stack spacing={2}>
                  <IntegrationSection
                    name="policy.title"
                    label={t(
                      'integrationPolicyPage.editor.videoTitle',
                      'Video Title'
                    )}
                    defaultExpanded
                    onOpenSelector={(callback) => handleOpenSelector(callback)}
                  />

                  <IntegrationSection
                    name="policy.season"
                    label={t(
                      'integrationPolicyPage.editor.seasonNumber',
                      'Season Number (Optional)'
                    )}
                    onOpenSelector={(callback) => handleOpenSelector(callback)}
                  />

                  <IntegrationSection
                    name="policy.episode"
                    label={t(
                      'integrationPolicyPage.editor.episodeNumber',
                      'Episode Number (Optional)'
                    )}
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

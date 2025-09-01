import { zodResolver } from '@hookform/resolvers/zod'
import { OpenInNew } from '@mui/icons-material'
import { Box, Button } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import type { Integration } from '@/common/options/integrationPolicyStore/schema'
import {
  createIntegrationInput,
  zIntegration,
} from '@/common/options/integrationPolicyStore/schema'
import { useIntegrationPolicyStore } from '@/common/options/integrationPolicyStore/useIntegrationPolicyStore'
import { docsLink } from '@/common/utils/utils'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { useActiveConfig } from '@/content/controller/common/hooks/useActiveConfig'
import { useActiveIntegration } from '@/content/controller/common/hooks/useActiveIntegration'
import { useStore } from '@/content/controller/store/store'
import { ElementSelector } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/components/ElementSelector'
import type { ArrayFieldNames } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/components/InputFieldArray'
import { IntegrationForm } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/components/IntegrationForm'

export const IntegrationEditor = () => {
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

  const form = useForm({
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

  const handleReset = () => {
    reset(defaultValues)
  }

  useEffect(() => {
    if (activePolicy) {
      reset(activePolicy)
    }
  }, [activePolicy])

  const toast = useToast.use.toast()

  const { mutate: saveForm } = useMutation({
    mutationFn: async (data: Integration) => {
      if (activePolicy) {
        return update(activePolicy.id, data)
      }
      if (activeConfig) {
        return add(data, activeConfig.id)
      }
      throw new Error('No active configuration or policy found for mutation.')
    },
    onSuccess: () => {
      if (isEdit) {
        toast.success(t('configs.alert.updated'))
      } else {
        toast.success(t('configs.alert.created'))
      }
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
              title=" "
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
                <Button
                  type="submit"
                  loading={isSubmitting}
                  variant="contained"
                  color="primary"
                >
                  {t('common.save')}
                </Button>
                <Button
                  type="reset"
                  onClick={() => handleReset()}
                  variant="outlined"
                  color="primary"
                >
                  {t('common.reset')}
                </Button>
              </div>
            </TabToolbar>
            <Box p={2}>
              <IntegrationForm onOpenSelector={handleOpenSelector} />
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

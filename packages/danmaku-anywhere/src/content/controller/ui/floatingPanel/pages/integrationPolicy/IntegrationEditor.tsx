import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronLeft, OpenInNew } from '@mui/icons-material'
import { LoadingButton } from '@mui/lab'
import { Button, Divider, IconButton, Stack } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { UseControllerProps } from 'react-hook-form'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import type { IntegrationInput } from '@/common/options/integrationPolicyStore/schema'
import {
  createIntegrationInput,
  integrationInputSchema,
} from '@/common/options/integrationPolicyStore/schema'
import { useIntegrationPolicyStore } from '@/common/options/integrationPolicyStore/useIntegrationPolicyStore'
import { docsLink } from '@/common/utils/utils'
import { useActiveConfig } from '@/content/controller/common/hooks/useActiveConfig'
import { useActiveIntegration } from '@/content/controller/common/hooks/useActiveIntegration'
import { useStore } from '@/content/controller/store/store'
import { ElementSelector } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/components/ElementSelector'
import { IntegrationForm } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/components/IntegrationForm'

export const IntegrationEditor = () => {
  const { t } = useTranslation()
  const activePolicy = useActiveIntegration()
  const mountConfig = useActiveConfig()
  const { update, add } = useIntegrationPolicyStore()

  const [showSelector, setShowSelector] = useState(false)
  const [selectedField, setSelectedField] = useState<{
    name: UseControllerProps<IntegrationInput>['name']
    index: number
  }>()

  const isEdit = !!activePolicy

  // Save form data to store so that it can be restored when the user comes back
  const { setData, data } = useStore.use.integrationForm()
  const { toggleEditor } = useStore.use.integrationForm()

  const form = useForm<IntegrationInput>({
    values: data,
    defaultValues: activePolicy ?? createIntegrationInput(),
    resolver: zodResolver(integrationInputSchema),
    mode: 'onChange',
  })

  useEffect(() => {
    const { unsubscribe } = form.watch((values) => {
      const result = integrationInputSchema.safeParse(values)
      if (result.success) {
        setData(result.data)
      }
    })

    return unsubscribe
  }, [form.watch])

  const {
    handleSubmit,
    getValues,
    formState: { isSubmitting },
  } = form

  const toast = useToast.use.toast()

  const { mutate: saveForm } = useMutation({
    mutationFn: async (data: IntegrationInput) => {
      if (activePolicy) {
        return update(activePolicy.id, data)
      } else {
        return add(data, mountConfig.id)
      }
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

  const handleOpenSelector = (
    name: UseControllerProps<IntegrationInput>['name'],
    index: number
  ) => {
    setShowSelector(true)
    setSelectedField({ name, index })
  }

  const handleSelectElement = (xPath: string) => {
    if (!selectedField) return
    const { name, index } = selectedField
    const values = getValues(name) as string[]
    const newValues = values.toSpliced(index, 1, xPath)
    form.setValue(name, newValues)
  }

  return (
    <>
      <form onSubmit={handleSubmit((data) => saveForm(data))}>
        <FormProvider {...form}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <IconButton onClick={() => toggleEditor()}>
              <ChevronLeft />
            </IconButton>
            <div>
              <Button
                variant="text"
                component="a"
                href={docsLink('integration-policy')}
                target="_blank"
              >
                {t('common.docs')}
                <OpenInNew fontSize="inherit" color="primary" />
              </Button>
              <LoadingButton
                type="submit"
                loading={isSubmitting}
                variant="contained"
                color="primary"
              >
                {t('common.save')}
              </LoadingButton>
            </div>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <IntegrationForm onOpenSelector={handleOpenSelector} />
        </FormProvider>
      </form>
      <ElementSelector
        enable={showSelector}
        onExit={() => setShowSelector(false)}
        onSelect={handleSelectElement}
      />
    </>
  )
}

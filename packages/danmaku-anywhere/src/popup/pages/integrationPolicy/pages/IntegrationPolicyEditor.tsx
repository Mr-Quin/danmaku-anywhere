import { zodResolver } from '@hookform/resolvers/zod'
import { ExpandLess, ExpandMore } from '@mui/icons-material'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import { LoadingButton } from '@mui/lab'
import {
  Box,
  Button,
  Checkbox,
  Collapse,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import type { FieldErrors, UseControllerProps } from 'react-hook-form'
import {
  FormProvider,
  Controller,
  useForm,
  useFormContext,
} from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

import { useToast } from '@/common/components/Toast/toastStore'
import type { XPathPolicyItem } from '@/common/options/integrationPolicyStore/schema'
import { xpathPolicyItemSchema } from '@/common/options/integrationPolicyStore/schema'
import { useIntegrationPolicyStore } from '@/common/options/integrationPolicyStore/useIntegrationPolicyStore'
import { tabRpcClient } from '@/common/rpcClient/tab/client'
import { getRandomUUID } from '@/common/utils/utils'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { useGoBack } from '@/popup/hooks/useGoBack'
import { useIsConnected } from '@/popup/hooks/useIsConnected'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'

interface IntegrationPolicyEditorProps {
  mode: 'add' | 'edit'
}

// Array Item Component for XPath Selectors
const InputFieldArray = ({
  name,
  label,
  getErrorMessage,
  getInitialValue,
}: {
  name: UseControllerProps<XPathPolicyItem>['name']
  label: string
  getErrorMessage: (
    errors: FieldErrors<XPathPolicyItem>,
    index: number
  ) => string | undefined
  getInitialValue: (values: XPathPolicyItem) => string[]
}) => {
  const { t } = useTranslation()

  const {
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useFormContext<XPathPolicyItem>()

  const [values, setValues] = useState<{ value: string; id: string }[]>(() =>
    getInitialValue(getValues()).map((value) => ({
      value,
      id: getRandomUUID(),
    }))
  )

  useEffect(() => {
    // flush the changes to the form
    setValue(
      name,
      values.map((v) => v.value)
    )
  }, [values, setValue])

  const append = () => {
    setValues([
      ...values,
      {
        value: '',
        id: getRandomUUID(),
      },
    ])
  }

  const remove = (index: number) => {
    setValues(values.toSpliced(index, 1))
  }

  const handleChange = (index: number, value: string) => {
    const newValues = values.toSpliced(index, 1, {
      value,
      id: values[index].id,
    })
    setValues(newValues)
  }

  return (
    <Box mb={2}>
      <Controller
        name={name}
        control={control}
        render={() => {
          return (
            <>
              {values.map((value, index) => {
                return (
                  <Box display="flex" alignItems="center" mb={1} key={value.id}>
                    <TextField
                      variant="standard"
                      fullWidth
                      value={value.value}
                      onChange={(e) => handleChange(index, e.target.value)}
                      error={!!getErrorMessage(errors, index)}
                      helperText={getErrorMessage(errors, index)}
                      label={`${label}[${index}]`}
                    />
                    {
                      // Only allow removing if there are more than 1 item
                      values.length > 1 && (
                        <IconButton onClick={() => remove(index)}>
                          <RemoveIcon />
                        </IconButton>
                      )
                    }
                  </Box>
                )
              })}
            </>
          )
        }}
      />
      <Button variant="text" startIcon={<AddIcon />} onClick={() => append()}>
        {t('common.add')}
      </Button>
    </Box>
  )
}

interface InputFieldArrayProps {
  children: ReactNode
  name: string
  initialOpen?: boolean
}

const CollapsableSection = ({
  children,
  name,
  initialOpen,
}: InputFieldArrayProps) => {
  const [open, setOpen] = useState(initialOpen ?? false)

  return (
    <Box sx={{ mt: 1 }}>
      <Stack direction="row" alignItems="center" mb={1}>
        <Typography variant="body1">{name}</Typography>
        <IconButton onClick={() => setOpen(!open)}>
          {open ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Stack>
      <Collapse in={open}>{children}</Collapse>
    </Box>
  )
}

export const IntegrationPolicyEditor = ({
  mode,
}: IntegrationPolicyEditorProps) => {
  const { t } = useTranslation()
  const { update, add } = useIntegrationPolicyStore()
  const connected = useIsConnected()
  const goBack = useGoBack()

  const isEdit = mode === 'edit'
  const config = useLocation().state

  const form = useForm<XPathPolicyItem>({
    defaultValues: config,
    resolver: zodResolver(xpathPolicyItemSchema),
  })

  const {
    handleSubmit,
    register,
    getValues,
    trigger,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = form

  const toast = useToast.use.toast()

  const { mutate: saveForm } = useMutation({
    mutationFn: async (data: XPathPolicyItem) => {
      if (isEdit) {
        return update(config.id, data)
      } else {
        return add(data)
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

  const {
    mutate: test,
    data: testResult,
    isPending: isTesting,
  } = useMutation({
    mutationFn: () => {
      const policyData = xpathPolicyItemSchema.parse(getValues())
      saveForm(policyData)
      return tabRpcClient.integrationPolicyTest(policyData)
    },
  })

  const titleOnly = watch('policy.titleOnly')
  const titleSelector = watch('policy.title.selector')

  useEffect(() => {
    if (titleOnly) {
      form.setValue('policy.episodeNumber.selector', titleSelector)
      form.setValue('policy.episodeTitle.selector', titleSelector)
      form.setValue('policy.seasonNumber.selector', titleSelector)
    }
  }, [titleSelector])

  return (
    <OptionsPageLayout direction="left">
      <form
        onSubmit={handleSubmit((data) =>
          saveForm(data, {
            onSuccess: () => {
              goBack()
            },
          })
        )}
      >
        <OptionsPageToolBar
          sticky
          title={
            isEdit
              ? t('integrationPolicyPage.editor.title.edit', {
                  name: config.name,
                })
              : t('integrationPolicyPage.editor.title.create')
          }
          rightElement={
            <div>
              <Tooltip
                title={
                  !connected &&
                  t('integrationPolicyPage.editor.helper.testDisabled')
                }
              >
                <span>
                  <LoadingButton
                    variant="text"
                    color="warning"
                    onClick={async () => {
                      if (await trigger()) {
                        test()
                      }
                    }}
                    disabled={!connected}
                    loading={isTesting}
                  >
                    {t('common.test')}
                  </LoadingButton>
                </span>
              </Tooltip>
              <LoadingButton
                variant="text"
                color="primary"
                type="submit"
                loading={isSubmitting}
              >
                {t('common.save')}
              </LoadingButton>
            </div>
          }
        />
        <FormProvider {...form}>
          <Box p={2}>
            <TextField
              label={t('integrationPolicyPage.editor.name')}
              variant="standard"
              fullWidth
              required
              {...register('name', { required: true })}
              error={!!errors.name}
              helperText={errors.name?.message}
              margin="none"
            />
            <FormControl>
              <FormControlLabel
                control={
                  <Controller
                    name="policy.titleOnly"
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
                label={t('integrationPolicyPage.editor.titleOnly')}
              />
              <FormHelperText>
                {t('integrationPolicyPage.editor.helper.titleOnly')}
              </FormHelperText>
            </FormControl>
            {/* Title */}
            <CollapsableSection
              name={t('integrationPolicyPage.editor.titleSection')}
              initialOpen={true}
            >
              <InputFieldArray
                name="policy.title.selector"
                label={t('integrationPolicyPage.editor.titleSelector')}
                getInitialValue={(values) => values.policy.title.selector}
                getErrorMessage={(errors, i) =>
                  errors.policy?.title?.selector?.[i]?.message
                }
              />
              <InputFieldArray
                name="policy.title.regex"
                label={t('integrationPolicyPage.editor.titleRegex')}
                getInitialValue={(values) => values.policy.title.regex}
                getErrorMessage={(errors, i) =>
                  errors.policy?.title?.regex?.[i]?.message
                }
              />
            </CollapsableSection>

            <Collapse in={!titleOnly}>
              {/*Season Number*/}
              <CollapsableSection
                name={t('integrationPolicyPage.editor.season')}
              >
                <InputFieldArray
                  name="policy.seasonNumber.selector"
                  label={t('integrationPolicyPage.editor.seasonSelector')}
                  getInitialValue={(values) =>
                    values.policy.seasonNumber.selector
                  }
                  getErrorMessage={(errors, i) =>
                    errors.policy?.seasonNumber?.selector?.[i]?.message
                  }
                />
                <InputFieldArray
                  name="policy.seasonNumber.regex"
                  label={t('integrationPolicyPage.editor.seasonRegex')}
                  getInitialValue={(values) => values.policy.seasonNumber.regex}
                  getErrorMessage={(errors, i) =>
                    errors.policy?.seasonNumber?.regex?.[i]?.message
                  }
                />
              </CollapsableSection>
              {/*Episode Number*/}
              <CollapsableSection
                name={t('integrationPolicyPage.editor.episode')}
              >
                <InputFieldArray
                  name="policy.episodeNumber.selector"
                  label={t('integrationPolicyPage.editor.episodeSelector')}
                  getInitialValue={(values) =>
                    values.policy.episodeNumber.selector
                  }
                  getErrorMessage={(errors, i) =>
                    errors.policy?.episodeNumber?.selector?.[i]?.message
                  }
                />
                <InputFieldArray
                  name="policy.episodeNumber.regex"
                  label={t('integrationPolicyPage.editor.episodeRegex')}
                  getInitialValue={(values) =>
                    values.policy.episodeNumber.regex
                  }
                  getErrorMessage={(errors, i) =>
                    errors.policy?.episodeNumber?.regex?.[i]?.message
                  }
                />
              </CollapsableSection>
              {/*Episode Title*/}
              <CollapsableSection
                name={t('integrationPolicyPage.editor.episodeTitle')}
              >
                <InputFieldArray
                  name="policy.episodeTitle.selector"
                  label={t('integrationPolicyPage.editor.episodeTitleSelector')}
                  getInitialValue={(values) =>
                    values.policy.episodeTitle.selector
                  }
                  getErrorMessage={(errors, i) =>
                    errors.policy?.episodeTitle?.selector?.[i]?.message
                  }
                />
                <InputFieldArray
                  name="policy.episodeTitle.regex"
                  label={t('integrationPolicyPage.editor.episodeTitleRegex')}
                  getInitialValue={(values) => values.policy.episodeTitle.regex}
                  getErrorMessage={(errors, i) =>
                    errors.policy?.episodeTitle?.regex?.[i]?.message
                  }
                />
              </CollapsableSection>
            </Collapse>

            {testResult && (
              <pre
                style={{
                  maxWidth: '100%',
                  textWrap: 'wrap',
                }}
              >
                {JSON.stringify(testResult, null, 2)}
              </pre>
            )}
          </Box>
        </FormProvider>
      </form>
    </OptionsPageLayout>
  )
}

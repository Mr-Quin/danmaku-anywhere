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
  Controller,
  FormProvider,
  useForm,
  useFormContext,
  useWatch,
} from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

import { useToast } from '@/common/components/Toast/toastStore'
import type { IntegrationPolicyItem } from '@/common/options/integrationPolicyStore/schema'
import { integrationPolicyItemSchema } from '@/common/options/integrationPolicyStore/schema'
import { useIntegrationPolicyStore } from '@/common/options/integrationPolicyStore/useIntegrationPolicyStore'
import { tabRpcClient } from '@/common/rpcClient/tab/client'
import { getRandomUUID } from '@/common/utils/utils'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { useGoBack } from '@/popup/hooks/useGoBack'
import { useIsConnected } from '@/popup/hooks/useIsConnected'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import type { IntegrationPolicyItemWithoutId } from '@/popup/pages/integrationPolicy/createXPathPolicyItem'

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
  name: UseControllerProps<IntegrationPolicyItem>['name']
  label: string
  getErrorMessage: (
    errors: FieldErrors<IntegrationPolicyItem>,
    index: number
  ) => string | undefined
  getInitialValue: (values: IntegrationPolicyItem) => string[]
}) => {
  const { t } = useTranslation()

  const {
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useFormContext<IntegrationPolicyItem>()

  const fieldValues = useWatch({ control })

  const [values, setValues] = useState<{ value: string; id: string }[]>(() =>
    getInitialValue(getValues()).map((value) => ({
      value,
      id: getRandomUUID(),
    }))
  )

  useEffect(() => {
    // Workaround for react-hook-form not working with primitive array
    // When the form value changes from elsewhere, update the local state
    // Very hacky
    setValues(
      getInitialValue(getValues()).map((value) => ({
        value,
        id: values.find((v) => v.value === value)?.id ?? getRandomUUID(),
      }))
    )
  }, [fieldValues])

  const flushChanges = (newValues: { value: string; id: string }[]) => {
    setValues(newValues)
    setValue(
      name,
      newValues.map((v) => v.value)
    )
  }

  const append = () => {
    flushChanges([
      ...values,
      {
        value: '',
        id: getRandomUUID(),
      },
    ])
  }

  const remove = (index: number) => {
    flushChanges(values.toSpliced(index, 1))
  }

  const handleChange = (index: number, value: string) => {
    const newValues = values.toSpliced(index, 1, {
      value,
      id: values[index].id,
    })
    flushChanges(newValues)
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
      <Collapse in={open} unmountOnExit>
        {children}
      </Collapse>
    </Box>
  )
}

const JsonForm = () => {
  const { getValues, reset } = useFormContext<IntegrationPolicyItemWithoutId>()

  const [jsonValue, setJsonValue] = useState<string>(() => {
    const values = getValues()
    delete values.id
    return JSON.stringify(values, null, 2)
  })

  const [error, setError] = useState<string>()

  return (
    <TextField
      multiline
      maxRows={15}
      fullWidth
      variant="outlined"
      inputProps={{
        style: {
          fontFamily: 'monospace',
        },
      }}
      value={jsonValue}
      error={!!error}
      helperText={error}
      onChange={(e) => {
        setJsonValue(e.target.value)
        try {
          const parsed = JSON.parse(e.target.value)
          const policy: IntegrationPolicyItemWithoutId =
            integrationPolicyItemSchema.parse(parsed)
          delete policy.id

          reset(policy)
          setError('')
        } catch (e) {
          if (e instanceof Error) {
            setError(e.message)
          }
        }
      }}
    />
  )
}

const NormalForm = () => {
  const { t } = useTranslation()

  const {
    control,
    register,
    watch,
    formState: { errors },
  } = useFormContext<IntegrationPolicyItem>()

  const titleOnly = watch('policy.titleOnly')

  return (
    <>
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

      <Collapse in={!titleOnly} unmountOnExit>
        {/*Season Number*/}
        <CollapsableSection name={t('integrationPolicyPage.editor.season')}>
          <InputFieldArray
            name="policy.season.selector"
            label={t('integrationPolicyPage.editor.seasonSelector')}
            getInitialValue={(values) => values.policy.season.selector}
            getErrorMessage={(errors, i) =>
              errors.policy?.season?.selector?.[i]?.message
            }
          />
          <InputFieldArray
            name="policy.season.regex"
            label={t('integrationPolicyPage.editor.seasonRegex')}
            getInitialValue={(values) => values.policy.season.regex}
            getErrorMessage={(errors, i) =>
              errors.policy?.season?.regex?.[i]?.message
            }
          />
        </CollapsableSection>
        {/*Episode Number*/}
        <CollapsableSection name={t('integrationPolicyPage.editor.episode')}>
          <InputFieldArray
            name="policy.episode.selector"
            label={t('integrationPolicyPage.editor.episodeSelector')}
            getInitialValue={(values) => values.policy.episode.selector}
            getErrorMessage={(errors, i) =>
              errors.policy?.episode?.selector?.[i]?.message
            }
          />
          <InputFieldArray
            name="policy.episode.regex"
            label={t('integrationPolicyPage.editor.episodeRegex')}
            getInitialValue={(values) => values.policy.episode.regex}
            getErrorMessage={(errors, i) =>
              errors.policy?.episode?.regex?.[i]?.message
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
            getInitialValue={(values) => values.policy.episodeTitle.selector}
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
    </>
  )
}

export const IntegrationPolicyEditor = ({
  mode,
}: IntegrationPolicyEditorProps) => {
  const { t } = useTranslation()
  const { update, add } = useIntegrationPolicyStore()
  const connected = useIsConnected()
  const goBack = useGoBack()
  const [preferJson, setPreferJson] = useState(false)

  const isEdit = mode === 'edit'
  const config = useLocation().state

  const form = useForm<IntegrationPolicyItem>({
    defaultValues: config,
    resolver: zodResolver(integrationPolicyItemSchema),
  })

  const {
    handleSubmit,
    getValues,
    trigger,
    formState: { isSubmitting },
  } = form

  const toast = useToast.use.toast()

  const { mutate: saveForm } = useMutation({
    mutationFn: async (data: IntegrationPolicyItem) => {
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
      const policyData = integrationPolicyItemSchema.parse(getValues())
      return tabRpcClient.integrationPolicyTest(policyData)
    },
  })

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
            <Button onClick={() => setPreferJson(!preferJson)}>
              {preferJson
                ? t('integrationPolicyPage.editor.switchToForm')
                : t('integrationPolicyPage.editor.switchToJSON')}
            </Button>
            {preferJson ? <JsonForm /> : <NormalForm />}
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

import { AddCircleOutline, RemoveCircleOutline } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Collapse,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { useIntegrationPolicyStore } from '@/common/options/integrationPolicyStore/useIntegrationPolicyStore'
import { isPatternPermissive } from '@/common/options/mountConfig/isPermissive'
import type { MountConfigInput } from '@/common/options/mountConfig/schema'
import { useEditMountConfig } from '@/common/options/mountConfig/useMountConfig'
import { validateOrigin } from '@/common/utils/utils'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { useGoBack } from '@/popup/hooks/useGoBack'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { useStore } from '@/popup/store'

// react-hook-form does not allow primitive arrays, so we need to convert the array to an object
type MountConfigForm = Omit<MountConfigInput, 'patterns'> & {
  patterns: { value: string }[]
}

const emptyIntegrationValue = '@@NONE@@'

const toForm = (config: MountConfigInput): MountConfigForm => {
  return {
    ...config,
    patterns: config.patterns.map((value) => ({ value })),
    integration: config.integration ?? emptyIntegrationValue,
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

export const MountConfigEditor = ({ mode }: MountConfigEditorProps) => {
  const { t } = useTranslation()
  const { update, create } = useEditMountConfig()
  const { policies } = useIntegrationPolicyStore()
  const [isPermissive, setIsPermissive] = useState(false)
  const goBack = useGoBack()

  const isEdit = mode === 'edit'
  const { editingConfig: config } = useStore.use.config()

  const {
    handleSubmit,
    control,
    register,
    subscribe,
    reset: resetForm,
    formState: { errors, isSubmitting },
  } = useForm<MountConfigForm>({
    values: toForm(config),
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'patterns',
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

  const addPatternField = () => {
    append({ value: '' })
  }

  const removePatternField = (index: number) => {
    remove(index)
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

  return (
    <OptionsPageLayout direction="left">
      <OptionsPageToolBar
        title={
          isEdit
            ? t('configPage.editor.title.edit', 'Edit {{name}}', {
                name: config.name,
              })
            : t('configPage.editor.title.create', 'Add Config')
        }
      />
      <Box p={2} component="form" onSubmit={handleSubmit(handleSave)}>
        <Stack direction="column" spacing={2} alignItems="flex-start">
          <Collapse in={isPermissive} sx={{ width: 1 }}>
            <Alert severity="warning">
              {t(
                'configPage.editor.tooPermissive',
                "The match patterns are too permissive, it's recommended to use narrower patterns."
              )}
            </Alert>
          </Collapse>
          <TextField
            label={t('configPage.editor.name', 'Name')}
            size="small"
            error={!!errors.name}
            {...register('name', { required: true })}
            fullWidth
            required
          />
          <TextField
            label={t('configPage.editor.mediaQuery', 'Video Node')}
            size="small"
            error={!!errors.mediaQuery}
            helperText={
              errors.mediaQuery
                ? errors.mediaQuery?.message
                : t(
                    'configPage.editor.helper.mediaQuery',
                    'CSS selector for the video node, normally "video"'
                  )
            }
            {...register('mediaQuery', { required: true })}
            fullWidth
            required
          />
          <Controller
            name="integration"
            control={control}
            render={({ field: { ref, ...field } }) => (
              <TextField
                {...field}
                label={t('integration.name', 'Integration')}
                size="small"
                select
                inputRef={ref}
                fullWidth
                helperText={t(
                  'configPage.editor.helper.integration',
                  'Enables the selected Integration Policy for this configuration. If you are not sure, leave it as None.'
                )}
              >
                {policies.map((policy) => (
                  <MenuItem value={policy.id} key={policy.id}>
                    {policy.name}
                  </MenuItem>
                ))}
                {/*  Extra menu item for 'none', the special string is converted to undefined */}
                <MenuItem value={emptyIntegrationValue}>
                  {t('integration.type.None', 'None')}
                </MenuItem>
              </TextField>
            )}
          />
          <Typography variant="body2" color="textSecondary">
            {t('configPage.editor.urlPatterns', 'URL Patterns')}
          </Typography>
          <FormHelperText>
            {t(
              'configPage.editor.helper.urlPattern',
              'URL pattern to match the page. Format: https://example.com/*.'
            )}
          </FormHelperText>
          {fields.map((field, index, arr) => (
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              key={field.id}
              sx={{ alignSelf: 'stretch' }}
            >
              <TextField
                label={`${t('configPage.editor.pattern', 'Pattern')} ${index + 1}`}
                error={!!errors.patterns?.[index]}
                helperText={errors.patterns?.[index]?.value?.message}
                size="small"
                {...register(`patterns.${index}.value`, {
                  validate: validateOrigin,
                })}
                fullWidth
                required
              />
              {arr.length > 1 ? (
                <Box>
                  <IconButton onClick={() => removePatternField(index)}>
                    <RemoveCircleOutline />
                  </IconButton>
                </Box>
              ) : (
                <Box />
              )}
            </Stack>
          ))}
          <Button onClick={addPatternField} startIcon={<AddCircleOutline />}>
            {t('configPage.editor.addPattern', 'Add Pattern')}
          </Button>
          <Stack
            direction="row"
            spacing={2}
            width={1}
            justifyContent="space-between"
          >
            <FormControl>
              <FormControlLabel
                control={
                  <Controller
                    name="enabled"
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
                label={t('common.enable', 'Enable')}
              />
            </FormControl>
            <div>
              {isEdit && (
                <Button
                  variant="outlined"
                  onClick={() => resetForm()}
                  disabled={isSubmitting}
                  sx={{ mr: 2 }}
                >
                  {t('common.reset', 'Reset')}
                </Button>
              )}
              <Button
                variant="contained"
                color="primary"
                type="submit"
                loading={isSubmitting}
              >
                {t('common.save', 'Save')}
              </Button>
            </div>
          </Stack>
        </Stack>
      </Box>
    </OptionsPageLayout>
  )
}

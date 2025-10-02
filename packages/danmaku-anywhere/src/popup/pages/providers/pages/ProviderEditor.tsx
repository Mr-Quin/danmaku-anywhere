import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { useToast } from '@/common/components/Toast/toastStore'
import type {
  ProviderConfig,
  BuiltInDanDanPlayProvider,
  BuiltInBilibiliProvider,
  BuiltInTencentProvider,
  CustomDanDanPlayProvider,
  CustomMacCmsProvider,
} from '@/common/options/providerConfig/schema'
import { useEditProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { useGoBack } from '@/popup/hooks/useGoBack'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { useStore } from '@/popup/store'

interface ProviderEditorProps {
  mode: 'add' | 'edit'
}

export const ProviderEditor = ({ mode }: ProviderEditorProps) => {
  const { t } = useTranslation()
  const { update, create } = useEditProviderConfig()
  const goBack = useGoBack()
  const toast = useToast.use.toast()

  const isEdit = mode === 'edit'
  const { editingProvider: provider } = useStore.use.providers()

  const {
    handleSubmit,
    control,
    register,
    reset: resetForm,
    formState: { errors, isSubmitting },
  } = useForm<ProviderConfig>({
    values: provider || undefined,
  })

  if (!provider) {
    return null
  }

  const isBuiltIn = provider.type.startsWith('builtin-')
  const isCustomDanDanPlay = provider.type === 'custom-dandanplay'
  const isCustomMacCms = provider.type === 'custom-maccms'
  const isBuiltInDanDanPlay = provider.type === 'builtin-dandanplay'
  const isBuiltInBilibili = provider.type === 'builtin-bilibili'
  const isBuiltInTencent = provider.type === 'builtin-tencent'

  const handleSave = async (data: ProviderConfig) => {
    if (isEdit && provider.id) {
      return update.mutate(
        { id: provider.id, config: data },
        {
          onSuccess: () => {
            toast.success(t('providers.alert.updated'))
            goBack()
          },
          onError: (error) => {
            toast.error(error.message)
          },
        }
      )
    }
    
    return create.mutate(data, {
      onSuccess: () => {
        toast.success(t('providers.alert.created'))
        goBack()
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })
  }

  const getTitle = () => {
    if (isEdit) {
      return t('providers.editor.title.edit', { name: provider.name })
    }
    if (isCustomDanDanPlay) {
      return t('providers.editor.title.addDanDanPlay')
    }
    if (isCustomMacCms) {
      return t('providers.editor.title.addMacCms')
    }
    return t('providers.editor.title.add')
  }

  return (
    <OptionsPageLayout direction="left">
      <OptionsPageToolBar title={getTitle()} />
      <Box p={2} component="form" onSubmit={handleSubmit(handleSave)}>
        <Stack direction="column" spacing={2} alignItems="flex-start">
          {/* Name field - readonly for built-in providers */}
          <TextField
            label={t('providers.editor.name')}
            size="small"
            error={!!errors.name}
            {...register('name', { required: !isBuiltIn })}
            fullWidth
            required={!isBuiltIn}
            disabled={isBuiltIn}
            helperText={isBuiltIn ? t('providers.editor.helper.builtInName') : undefined}
          />

          {/* Built-in DanDanPlay options */}
          {isBuiltInDanDanPlay && (
            <Controller
              name="options.chConvert"
              control={control}
              render={({ field: { ref, ...field } }) => (
                <TextField
                  {...field}
                  label={t('providers.editor.chConvert')}
                  size="small"
                  select
                  inputRef={ref}
                  fullWidth
                  helperText={t('providers.editor.helper.chConvert')}
                >
                  <MenuItem value={DanDanChConvert.None}>
                    {t('providers.chConvert.none')}
                  </MenuItem>
                  <MenuItem value={DanDanChConvert.ToSimplified}>
                    {t('providers.chConvert.toSimplified')}
                  </MenuItem>
                  <MenuItem value={DanDanChConvert.ToTraditional}>
                    {t('providers.chConvert.toTraditional')}
                  </MenuItem>
                </TextField>
              )}
            />
          )}

          {/* Built-in Bilibili options */}
          {isBuiltInBilibili && (
            <>
              <Controller
                name="options.danmakuTypePreference"
                control={control}
                render={({ field: { ref, ...field } }) => (
                  <TextField
                    {...field}
                    label={t('providers.editor.danmakuTypePreference')}
                    size="small"
                    select
                    inputRef={ref}
                    fullWidth
                    helperText={t('providers.editor.helper.danmakuTypePreference')}
                  >
                    <MenuItem value="xml">XML</MenuItem>
                    <MenuItem value="protobuf">Protobuf</MenuItem>
                  </TextField>
                )}
              />
              <TextField
                label={t('providers.editor.protobufLimitPerMin')}
                size="small"
                type="number"
                error={!!errors.options}
                {...register('options.protobufLimitPerMin', {
                  valueAsNumber: true,
                  min: 1,
                  max: 1000,
                })}
                fullWidth
                helperText={t('providers.editor.helper.protobufLimitPerMin')}
              />
            </>
          )}

          {/* Built-in Tencent options */}
          {isBuiltInTencent && (
            <TextField
              label={t('providers.editor.limitPerMin')}
              size="small"
              type="number"
              error={!!errors.options}
              {...register('options.limitPerMin', {
                valueAsNumber: true,
                min: 1,
                max: 1000,
              })}
              fullWidth
              helperText={t('providers.editor.helper.limitPerMin')}
            />
          )}

          {/* Custom DanDanPlay options */}
          {isCustomDanDanPlay && (
            <>
              <TextField
                label={t('providers.editor.baseUrl')}
                size="small"
                error={!!errors.options}
                {...register('options.baseUrl', {
                  required: true,
                  pattern: {
                    value: /^https?:\/\/.+/,
                    message: t('providers.editor.error.invalidUrl'),
                  },
                })}
                fullWidth
                required
                helperText={
                  errors.options?.baseUrl?.message ||
                  t('providers.editor.helper.baseUrl')
                }
              />
              <Controller
                name="options.chConvert"
                control={control}
                render={({ field: { ref, ...field } }) => (
                  <TextField
                    {...field}
                    label={t('providers.editor.chConvert')}
                    size="small"
                    select
                    inputRef={ref}
                    fullWidth
                    helperText={t('providers.editor.helper.chConvert')}
                  >
                    <MenuItem value={DanDanChConvert.None}>
                      {t('providers.chConvert.none')}
                    </MenuItem>
                    <MenuItem value={DanDanChConvert.ToSimplified}>
                      {t('providers.chConvert.toSimplified')}
                    </MenuItem>
                    <MenuItem value={DanDanChConvert.ToTraditional}>
                      {t('providers.chConvert.toTraditional')}
                    </MenuItem>
                  </TextField>
                )}
              />
            </>
          )}

          {/* Custom MacCMS options */}
          {isCustomMacCms && (
            <>
              <TextField
                label={t('providers.editor.danmakuBaseUrl')}
                size="small"
                error={!!errors.options}
                {...register('options.danmakuBaseUrl', {
                  required: true,
                  pattern: {
                    value: /^https?:\/\/.+/,
                    message: t('providers.editor.error.invalidUrl'),
                  },
                })}
                fullWidth
                required
                helperText={
                  errors.options?.danmakuBaseUrl?.message ||
                  t('providers.editor.helper.danmakuBaseUrl')
                }
              />
              <TextField
                label={t('providers.editor.danmuicuBaseUrl')}
                size="small"
                error={!!errors.options}
                {...register('options.danmuicuBaseUrl', {
                  required: true,
                  pattern: {
                    value: /^https?:\/\/.+/,
                    message: t('providers.editor.error.invalidUrl'),
                  },
                })}
                fullWidth
                required
                helperText={
                  errors.options?.danmuicuBaseUrl?.message ||
                  t('providers.editor.helper.danmuicuBaseUrl')
                }
              />
              <FormControl>
                <FormControlLabel
                  control={
                    <Controller
                      name="options.stripColor"
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
                  label={t('providers.editor.stripColor')}
                />
              </FormControl>
            </>
          )}

          {/* Enable/Disable toggle */}
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
                label={t('common.enable')}
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
                  {t('common.reset')}
                </Button>
              )}
              <Button
                variant="contained"
                color="primary"
                type="submit"
                loading={isSubmitting}
              >
                {t('common.save')}
              </Button>
            </div>
          </Stack>
        </Stack>
      </Box>
    </OptionsPageLayout>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import {
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { produce } from 'immer'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/toast/toastStore'
import {
  ChConvertList,
  danmakuSourcesSchema,
  defaultExtensionOptions,
} from '@/common/options/extensionOptions/extensionOptions'
import type { DanmakuSources } from '@/common/options/extensionOptions/extensionOptions'
import { useExtensionOptionsSuspense } from '@/common/options/extensionOptions/useExtensionOptionsSuspense'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'

export const DanmakuSource = () => {
  const { t } = useTranslation()
  const { data, partialUpdate } = useExtensionOptionsSuspense()

  const { toast } = useToast()

  const {
    register,
    control,
    reset: resetForm,
    getValues,
    formState: { errors },
  } = useForm<DanmakuSources>({
    resolver: zodResolver(danmakuSourcesSchema),
    values: data.danmakuSources,
    defaultValues: data.danmakuSources,
    mode: 'onChange',
  })

  console.log({ data: data.danmakuSources, values: getValues() })

  const { mutate: handleApply } = useMutation({
    mutationFn: async () => {
      await partialUpdate(
        produce(data, (draft) => {
          draft.danmakuSources.dandanplay = getValues().dandanplay
        })
      )
    },
    onSuccess: () => {
      toast.success(t('common.success'))
    },
  })

  const { mutate: handleReset } = useMutation({
    mutationFn: async () => {
      resetForm()
      await partialUpdate(
        produce(data, (draft) => {
          draft.danmakuSources.dandanplay =
            defaultExtensionOptions.danmakuSources.dandanplay
        })
      )
    },
    onSuccess: () => {
      toast.success(t('common.success'))
    },
  })

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title={t('optionsPage.pages.danmakuSource')} />
      <Box p={2}>
        <Typography variant="h6">{t('danmaku.type.DDP')}</Typography>
        <Stack mt={2} gap={2}>
          <Controller
            name="dandanplay.chConvert"
            control={control}
            render={({ field }) => {
              return (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label={t('optionsPage.chConvert.name')}
                  error={!!errors.dandanplay?.chConvert}
                  helperText={errors.dandanplay?.chConvert?.message}
                >
                  {ChConvertList.map((option) => (
                    <MenuItem value={option.value} key={option.label}>
                      {t(option.label)}
                    </MenuItem>
                  ))}
                </TextField>
              )
            }}
          />
          <TextField
            fullWidth
            label={t('common.apiEndpoint')}
            error={!!errors.dandanplay?.baseUrl}
            helperText={errors.dandanplay?.baseUrl?.message}
            {...register('dandanplay.baseUrl')}
          />
          <Box>
            <Button
              onClick={() => handleApply()}
              variant="contained"
              sx={{
                mr: 1,
              }}
            >
              {t('common.apply')}
            </Button>
            <Button onClick={() => handleReset()}>{t('common.reset')}</Button>
          </Box>
        </Stack>
      </Box>
    </OptionsPageLayout>
  )
}

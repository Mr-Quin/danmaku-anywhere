import { zodResolver } from '@hookform/resolvers/zod'
import {
  Box,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { produce } from 'immer'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import {
  DanmakuSourceType,
  localizedDanmakuSourceType,
} from '@/common/danmaku/enums'
import { ChConvertList } from '@/common/options/extensionOptions/constant'
import type { DanmakuSources } from '@/common/options/extensionOptions/schema'
import { danmakuSourcesSchema } from '@/common/options/extensionOptions/schema'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'

export const DanDanPlayOptions = () => {
  const { t } = useTranslation()
  const { data, partialUpdate } = useExtensionOptions()

  const { toast } = useToast()

  const {
    control,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<DanmakuSources>({
    resolver: zodResolver(danmakuSourcesSchema),
    defaultValues: data.danmakuSources,
    mode: 'onChange',
  })

  const { mutate: handleApply } = useMutation({
    mutationFn: async (update: DanmakuSources) => {
      await partialUpdate(
        produce(data, (draft) => {
          draft.danmakuSources.dandanplay = update.dandanplay
        })
      )
    },
    onSuccess: () => {
      toast.success(t('common.success'))
    },
  })

  useEffect(() => {
    const subscription = watch(() => {
      handleSubmit((update) => handleApply(update))()
    })

    return () => subscription.unsubscribe()
  }, [handleSubmit, watch])

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar
        title={t(localizedDanmakuSourceType(DanmakuSourceType.DanDanPlay))}
      />
      <Box p={2}>
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
          <Controller
            name="dandanplay.useProxy"
            control={control}
            render={({ field: { onChange, value } }) => {
              return (
                <FormControlLabel
                  control={<Switch checked={value} onChange={onChange} />}
                  label={t('optionsPage.danmakuSource.dandanplay.useProxy')}
                />
              )
            }}
          />
        </Stack>
      </Box>
    </OptionsPageLayout>
  )
}

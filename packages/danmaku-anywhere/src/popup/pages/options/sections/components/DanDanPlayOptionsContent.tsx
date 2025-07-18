import { zodResolver } from '@hookform/resolvers/zod'
import { MenuItem, Stack, TextField } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { produce } from 'immer'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { ChConvertList } from '@/common/options/extensionOptions/constant'
import type { DanmakuSources } from '@/common/options/extensionOptions/schema'
import { danmakuSourcesSchema } from '@/common/options/extensionOptions/schema'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'

export const DanDanPlayOptionsContent = () => {
  const { t } = useTranslation()
  const { data, partialUpdate } = useExtensionOptions()

  const { toast } = useToast()

  const form = useForm({
    resolver: zodResolver(danmakuSourcesSchema),
    defaultValues: data.danmakuSources,
    values: data.danmakuSources,
    mode: 'onChange',
  })

  const {
    control,
    watch,
    handleSubmit,
    formState: { errors },
  } = form

  const { mutate } = useMutation({
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

  const formData = watch()

  useEffect(() => {
    if (form.formState.isDirty && !form.formState.isSubmitted) {
      handleSubmit((data) => {
        mutate(data)
      })()
    }
  }, [formData])

  return (
    <Stack gap={2}>
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
              size="small"
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
    </Stack>
  )
}

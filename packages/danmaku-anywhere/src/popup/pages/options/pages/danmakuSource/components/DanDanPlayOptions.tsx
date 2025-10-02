import { zodResolver } from '@hookform/resolvers/zod'
import {
  Checkbox,
  debounce,
  FormControl,
  FormControlLabel,
  MenuItem,
  TextField,
} from '@mui/material'
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

export const DanDanPlayOptions = () => {
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
    handleSubmit,
    formState: { errors },
    subscribe,
  } = form

  const { mutate } = useMutation({
    mutationFn: async (update: DanmakuSources) => {
      console.log('mutate', update)
      await partialUpdate(
        produce(data, (draft) => {
          draft.danmakuSources.dandanplay = update.dandanplay
        })
      )
    },
    onSuccess: () => {
      toast.success(t('common.saved'))
    },
  })

  useEffect(() => {
    const debouncedSave = debounce(() => {
      handleSubmit((data) => mutate(data))()
    }, 500)

    const unsubscribe = subscribe({
      formState: {
        isDirty: true,
        isValid: true,
      },
      callback: ({ isDirty, isValid }) => {
        console.log('subscribe', isDirty, isValid)
        if (!isDirty || !isValid) {
          return
        }
        debouncedSave()
      },
    })

    return () => {
      unsubscribe()
    }
  }, [subscribe])

  return (
    <>
      <Controller
        name="dandanplay.chConvert"
        control={control}
        render={({ field }) => {
          return (
            <TextField
              {...field}
              select
              fullWidth
              margin="dense"
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
      <FormControl>
        <FormControlLabel
          control={
            <Controller
              name="dandanplay.useCustomRoot"
              control={control}
              render={({ field: { value, ref, ...field } }) => {
                return (
                  <Checkbox
                    {...field}
                    slotProps={{
                      input: {
                        ref,
                      },
                    }}
                    checked={value}
                  />
                )
              }}
            />
          }
          label={t('optionsPage.danmakuSource.dandanplay.useCustomRoot')}
          labelPlacement="start"
          sx={{ m: 0, alignSelf: 'start', color: 'text.secondary' }}
        />
      </FormControl>
      <Controller
        name="dandanplay.baseUrl"
        control={control}
        render={({ field }) => {
          return (
            <TextField
              {...field}
              fullWidth
              margin="dense"
              label={t('optionsPage.danmakuSource.dandanplay.apiUrl')}
              error={!!errors.dandanplay?.baseUrl}
              helperText={errors.dandanplay?.baseUrl?.message}
              disabled={!form.watch('dandanplay.useCustomRoot')}
            />
          )
        }}
      />
    </>
  )
}

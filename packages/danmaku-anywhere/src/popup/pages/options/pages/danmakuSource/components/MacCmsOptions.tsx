import { zodResolver } from '@hookform/resolvers/zod'
import {
  Checkbox,
  debounce,
  FormControl,
  FormControlLabel,
  FormHelperText,
  TextField,
} from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { produce } from 'immer'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import type { DanmakuSources } from '@/common/options/extensionOptions/schema'
import { danmakuSourcesSchema } from '@/common/options/extensionOptions/schema'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'

export const MacCmsOptions = () => {
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
      await partialUpdate(
        produce(data, (draft) => {
          draft.danmakuSources.custom = update.custom
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
        values: true,
        isDirty: true,
        isValid: true,
      },
      name: ['custom.stripColor', 'custom.baseUrl', 'custom.danmuicuBaseUrl'],
      callback: ({ isDirty, isValid }) => {
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
        name="custom.baseUrl"
        control={control}
        render={({ field }) => {
          return (
            <TextField
              {...field}
              sx={{ my: 1 }}
              fullWidth
              label={t('optionsPage.danmakuSource.macCms.baseUrl')}
              error={!!errors.custom?.baseUrl}
              helperText={errors.custom?.baseUrl?.message}
            />
          )
        }}
      />
      <Controller
        name="custom.danmuicuBaseUrl"
        control={control}
        render={({ field }) => {
          return (
            <TextField
              {...field}
              sx={{ my: 1 }}
              fullWidth
              label={t('optionsPage.danmakuSource.macCms.danmuicuBaseUrl')}
              error={!!errors.custom?.danmuicuBaseUrl}
              helperText={errors.custom?.danmuicuBaseUrl?.message}
            />
          )
        }}
      />
      <FormControl>
        <FormControlLabel
          control={
            <Controller
              name="custom.stripColor"
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
                    color="primary"
                  />
                )
              }}
            />
          }
          label={t('optionsPage.danmakuSource.macCms.stripColor')}
          labelPlacement="start"
          sx={{ m: 0, alignSelf: 'start', color: 'text.secondary' }}
        />
        <FormHelperText>
          {t('optionsPage.danmakuSource.macCms.help.stripColor')}
        </FormHelperText>
      </FormControl>
    </>
  )
}

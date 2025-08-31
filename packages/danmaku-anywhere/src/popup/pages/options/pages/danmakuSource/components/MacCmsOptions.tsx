import { zodResolver } from '@hookform/resolvers/zod'
import {
  Checkbox,
  debounce,
  FormControl,
  FormControlLabel,
  FormHelperText,
  MenuItem,
  TextField,
} from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { produce } from 'immer'
import { memo, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import type { DanmakuSources } from '@/common/options/extensionOptions/schema'
import { danmakuSourcesSchema } from '@/common/options/extensionOptions/schema'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { configQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const MacCmsOptions = memo(() => {
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
      toast.success(t('common.saved'), { duration: 1000 })
    },
  })

  const [maccmsOpen, setMaccmsOpen] = useState(false)
  const [danmuicuOpen, setDanmuicuOpen] = useState(false)

  const { data: maccmsData, isFetching: isFetchingMaccms } = useQuery({
    queryKey: configQueryKeys.maccms(),
    queryFn: async () => chromeRpcClient.getConfigMacCms(),
    select: (res) => {
      return res.data
    },
    enabled: maccmsOpen,
  })

  const { data: danmuicuData, isFetching: isFetchingDanmuicu } = useQuery({
    queryKey: configQueryKeys.danmuicu(),
    queryFn: async () => chromeRpcClient.getConfigDanmuIcu(),
    select: (res) => {
      return res.data
    },
    enabled: danmuicuOpen,
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
        render={({ field: { ref, ...field } }) => {
          return (
            <TextField
              {...field}
              select
              inputRef={ref}
              sx={{ my: 1 }}
              slotProps={{
                select: {
                  open: maccmsOpen,
                  onOpen: () => setMaccmsOpen(true),
                  onClose: () => setMaccmsOpen(false),
                },
              }}
              fullWidth
              label={t('optionsPage.danmakuSource.macCms.baseUrl')}
              error={!!errors.custom?.baseUrl}
              helperText={errors.custom?.baseUrl?.message}
            >
              {(maccmsData?.baseUrls ?? [field.value]).map((url) => (
                <MenuItem key={url} value={url}>
                  {url}
                </MenuItem>
              ))}
              {isFetchingMaccms && (
                <MenuItem disabled value="">
                  {t('common.loading')}
                </MenuItem>
              )}
            </TextField>
          )
        }}
      />
      <Controller
        name="custom.danmuicuBaseUrl"
        control={control}
        render={({ field: { ref, ...field } }) => {
          return (
            <TextField
              {...field}
              select
              inputRef={ref}
              sx={{ my: 1 }}
              slotProps={{
                select: {
                  open: danmuicuOpen,
                  onOpen: () => setDanmuicuOpen(true),
                  onClose: () => setDanmuicuOpen(false),
                },
              }}
              fullWidth
              label={t('optionsPage.danmakuSource.macCms.danmuicuBaseUrl')}
              error={!!errors.custom?.danmuicuBaseUrl}
              helperText={errors.custom?.danmuicuBaseUrl?.message}
            >
              {(danmuicuData?.baseUrls ?? [field.value]).map((url) => (
                <MenuItem key={url} value={url}>
                  {url}
                </MenuItem>
              ))}
              {isFetchingDanmuicu && (
                <MenuItem disabled value="">
                  {t('common.loading')}
                </MenuItem>
              )}
            </TextField>
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
})

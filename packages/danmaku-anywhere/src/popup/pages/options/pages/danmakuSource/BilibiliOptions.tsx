import { zodResolver } from '@hookform/resolvers/zod'
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
} from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { produce } from 'immer'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import {
  DanmakuSourceType,
  localizedDanmakuSourceType,
} from '@/common/danmaku/enums'
import { defaultExtensionOptions } from '@/common/options/extensionOptions/constant'
import type { DanmakuSources } from '@/common/options/extensionOptions/schema'
import { danmakuSourcesSchema } from '@/common/options/extensionOptions/schema'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'

export const BilibiliOptions = () => {
  const { t } = useTranslation()
  const { data, partialUpdate } = useExtensionOptions()

  const { toast } = useToast()

  const {
    register,
    control,
    reset: resetForm,
    getValues,
    resetField,
    watch,
    formState: { errors },
  } = useForm<DanmakuSources>({
    resolver: zodResolver(danmakuSourcesSchema),
    values: data.danmakuSources,
    defaultValues: data.danmakuSources,
    mode: 'onChange',
  })

  const isProtobuf = watch('bilibili.danmakuTypePreference') === 'protobuf'

  const { mutate: handleApply } = useMutation({
    mutationFn: async () => {
      await partialUpdate(
        produce(data, (draft) => {
          draft.danmakuSources.bilibili = getValues().bilibili
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
          draft.danmakuSources.bilibili =
            defaultExtensionOptions.danmakuSources.bilibili
        })
      )
    },
    onSuccess: () => {
      toast.success(t('common.success'))
    },
  })

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar
        title={t(localizedDanmakuSourceType(DanmakuSourceType.Bilibili))}
      />
      <Box p={2}>
        <Stack gap={2}>
          <FormControl>
            <FormLabel>
              {t('optionsPage.danmakuSource.bilibili.danmakuTypePreference')}
            </FormLabel>
            <Controller
              name="bilibili.danmakuTypePreference"
              control={control}
              render={({ field }) => {
                return (
                  <RadioGroup
                    row
                    {...field}
                    onChange={(e) => {
                      field.onChange(e)
                      resetField('bilibili.protobufLimitPerMin')
                    }}
                  >
                    <FormControlLabel
                      value="xml"
                      control={<Radio />}
                      label="XML"
                    />
                    <FormControlLabel
                      value="protobuf"
                      control={<Radio />}
                      label="Protobuf"
                    />
                  </RadioGroup>
                )
              }}
            />
            <FormHelperText>
              {t(
                'optionsPage.danmakuSource.bilibili.help.danmakuTypePreferenceXML'
              )}
            </FormHelperText>
            <FormHelperText>
              {t(
                'optionsPage.danmakuSource.bilibili.help.danmakuTypePreferenceProtobuf'
              )}
            </FormHelperText>
          </FormControl>
          {isProtobuf && (
            <TextField
              {...register('bilibili.protobufLimitPerMin', {
                valueAsNumber: true,
              })}
              margin="normal"
              label={t(
                'optionsPage.danmakuSource.bilibili.protobufLimitPerMin'
              )}
              error={!!errors.bilibili?.protobufLimitPerMin}
              helperText={
                errors.bilibili?.protobufLimitPerMin?.message ??
                t('optionsPage.danmakuSource.bilibili.help.protobufLimitPerMin')
              }
            />
          )}
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

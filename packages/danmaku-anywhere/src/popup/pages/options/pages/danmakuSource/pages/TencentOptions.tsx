import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Button, Stack, TextField } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { produce } from 'immer'
import { useForm } from 'react-hook-form'
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

export const TencentOptions = () => {
  const { t } = useTranslation()
  const { data, partialUpdate } = useExtensionOptions()

  const { toast } = useToast()

  const {
    register,
    reset: resetForm,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(danmakuSourcesSchema),
    values: data.danmakuSources,
    defaultValues: data.danmakuSources,
    mode: 'onChange',
  })

  const submitMutation = useMutation({
    mutationFn: async (update: DanmakuSources) => {
      await partialUpdate(
        produce(data, (draft) => {
          draft.danmakuSources.tencent = update.tencent
        })
      )
    },
    onSuccess: () => {
      toast.success(t('common.success'))
    },
  })

  const handleApply = () => {
    handleSubmit((d) => submitMutation.mutate(d))
  }

  const { mutate: handleReset } = useMutation({
    mutationFn: async () => {
      resetForm()
      await partialUpdate(
        produce(data, (draft) => {
          draft.danmakuSources.tencent =
            defaultExtensionOptions.danmakuSources.tencent
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
          <TextField
            {...register('tencent.limitPerMin', {
              valueAsNumber: true,
            })}
            margin="normal"
            label={t('optionsPage.danmakuSource.tencent.limitPerMin')}
            error={!!errors.tencent?.limitPerMin}
            helperText={
              errors.tencent?.limitPerMin?.message ??
              t('optionsPage.danmakuSource.tencent.help.limitPerMin')
            }
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

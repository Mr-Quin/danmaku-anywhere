import { API_ROOT } from '@danmaku-anywhere/dandanplay-api'
import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Button, Divider, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { useToast } from '@/common/components/toast/toastStore'
import { useExtensionOptionsSuspense } from '@/common/options/extensionOptions/useExtensionOptionsSuspense'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'

const danmakuSourceFormSchema = z.object({
  dandanplayBaseUrl: z.string().url(),
})

interface DanmakuSourceForm {
  dandanplayBaseUrl: string
}

export const DanmakuSource = () => {
  const { t } = useTranslation()
  const { data, partialUpdate } = useExtensionOptionsSuspense()

  const { toast } = useToast()

  const {
    register,
    reset: resetForm,
    getValues,
    formState: { errors },
  } = useForm<DanmakuSourceForm>({
    resolver: zodResolver(danmakuSourceFormSchema),
    values: { dandanplayBaseUrl: data.danmakuSources.dandanplay.baseUrl },
    mode: 'onChange',
  })

  const { mutate: handleApply } = useMutation({
    mutationFn: async () => {
      await partialUpdate({
        danmakuSources: {
          dandanplay: {
            baseUrl: getValues().dandanplayBaseUrl,
          },
        },
      })
    },
    onSuccess: () => {
      console.log('success')
      toast.success(t('common.success'))
    },
  })

  const handleReset = async () => {
    resetForm()
    await partialUpdate({
      danmakuSources: {
        dandanplay: {
          baseUrl: API_ROOT,
        },
      },
    })
  }

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title={t('optionsPage.pages.danmakuSource')} />
      <Box p={2}>
        <Typography variant="h6">{t('common.apiEndpoint')}</Typography>
        <Divider />

        <Box
          mt={2}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <TextField
            label={t('danmaku.type.DDP')}
            error={!!errors.dandanplayBaseUrl}
            helperText={errors.dandanplayBaseUrl?.message}
            {...register('dandanplayBaseUrl')}
            sx={{
              flexGrow: 1,
            }}
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
            <Button onClick={handleReset}>{t('common.reset')}</Button>
          </Box>
        </Box>
      </Box>
    </OptionsPageLayout>
  )
}

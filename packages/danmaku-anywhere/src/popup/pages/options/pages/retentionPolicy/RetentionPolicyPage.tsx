import { zodResolver } from '@hookform/resolvers/zod'
import { LoadingButton } from '@mui/lab'
import {
  Divider,
  List,
  ListItem,
  ListItemText,
  Box,
  Stack,
  Switch,
  TextField,
  InputAdornment,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { produce } from 'immer'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router'

import { alarmKeys } from '@/common/alarms/constants'
import { useToast } from '@/common/components/Toast/toastStore'
import type { RetentionPolicy } from '@/common/options/extensionOptions/schema'
import { retentionPolicySchema } from '@/common/options/extensionOptions/schema'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { alarmQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'

export const RetentionPolicyPage = () => {
  const { t } = useTranslation()
  const { data, partialUpdate } = useExtensionOptions()
  const queryClient = useQueryClient()

  const { toast } = useToast()

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<RetentionPolicy>({
    resolver: zodResolver(retentionPolicySchema),
    defaultValues: data.retentionPolicy,
    mode: 'onChange',
  })

  const { mutate: handleApply, isPending } = useMutation({
    mutationFn: async (update: RetentionPolicy) => {
      await partialUpdate(
        produce(data, (draft) => {
          draft.retentionPolicy = update
        })
      )
      reset(update)
      await queryClient.resetQueries({
        queryKey: alarmQueryKeys.danmakuPurge(),
      })
    },
    onSuccess: () => {
      toast.success(t('common.success'))
    },
  })

  const { mutate: purgeDanmaku, isPending: isPurgingDanmaku } = useMutation({
    mutationFn: async () => {
      const res = await chromeRpcClient.danmakuPurgeCache()
      return res.data
    },
    onSuccess: (count) => {
      toast.success(
        t('optionsPage.retentionPolicy.alert.nDanmakuDeleted', {
          count,
        })
      )
    },
  })

  const { data: nextPurgeTime } = useQuery({
    queryKey: alarmQueryKeys.danmakuPurge(),
    queryFn: async () => {
      const alarm = await chrome.alarms.get(alarmKeys.danmakuPurge)
      return alarm || null
    },
    select: (data) => {
      return new Date(data.scheduledTime).toLocaleString()
    },
    enabled: data.retentionPolicy.enabled,
  })

  return (
    <>
      <OptionsPageLayout>
        <OptionsPageToolBar title={t('optionsPage.pages.retentionPolicy')} />
        <Box px={2}>
          <List>
            <ListItem disablePadding>
              <ListItemText
                primary={
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <>{t('optionsPage.retentionPolicy.enabled')}</>
                    <Controller
                      name="enabled"
                      control={control}
                      render={({ field: { onChange, value } }) => {
                        return <Switch checked={value} onChange={onChange} />
                      }}
                    />
                  </Stack>
                }
              />
            </ListItem>
            <Divider />
            <ListItem disablePadding>
              <ListItemText
                primary={
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <>{t('optionsPage.retentionPolicy.deleteCommentsAfter')}</>
                    <Controller
                      name="deleteCommentsAfter"
                      control={control}
                      render={({ field }) => {
                        return (
                          <TextField
                            {...field}
                            sx={{ width: 150 }}
                            size="small"
                            autoComplete="off"
                            slotProps={{
                              input: {
                                endAdornment: (
                                  <InputAdornment position="end">
                                    {t('common.duration.day', {
                                      count: parseInt(`${field.value}`),
                                    })}
                                  </InputAdornment>
                                ),
                              },
                            }}
                            type="number"
                            error={!!errors.deleteCommentsAfter}
                            helperText={errors.deleteCommentsAfter?.message}
                          />
                        )
                      }}
                    />
                  </Stack>
                }
                secondary={
                  <>
                    <div>
                      {t(
                        'optionsPage.retentionPolicy.tooltip.deleteCommentsAfter'
                      )}
                    </div>
                    {nextPurgeTime && (
                      <div>
                        {t('optionsPage.retentionPolicy.tooltip.nextPurge', {
                          time: nextPurgeTime,
                        })}
                      </div>
                    )}
                  </>
                }
              />
            </ListItem>
          </List>
          <Stack direction="row">
            <LoadingButton
              onClick={handleSubmit((update) => handleApply(update))}
              loading={isPending}
              variant="contained"
              disabled={!isDirty}
            >
              {t('common.apply')}
            </LoadingButton>
            <LoadingButton
              onClick={() => purgeDanmaku()}
              loading={isPurgingDanmaku}
              variant="contained"
              color="error"
              sx={{ ml: 'auto' }}
              disabled={!data.retentionPolicy.enabled || isDirty}
            >
              {t('optionsPage.retentionPolicy.purgeNow')}
            </LoadingButton>
          </Stack>
        </Box>
      </OptionsPageLayout>
      <Outlet />
    </>
  )
}

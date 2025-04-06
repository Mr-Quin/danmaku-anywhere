import { zodResolver } from '@hookform/resolvers/zod'
import {
  Box,
  Button,
  Divider,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Stack,
  Switch,
  TextField,
} from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { produce } from 'immer'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router'

import { alarmKeys } from '@/common/alarms/constants'
import { useToast } from '@/common/components/Toast/toastStore'
import type { RetentionPolicy } from '@/common/options/extensionOptions/schema'
import { retentionPolicySchema } from '@/common/options/extensionOptions/schema'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { alarmQueryKeys, danmakuQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'

export const RetentionPolicyPage = () => {
  const { t } = useTranslation()
  const { data, partialUpdate } = useExtensionOptions()

  const { retentionPolicy } = data

  const { toast } = useToast()

  const {
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isDirty },
  } = useForm<RetentionPolicy>({
    resolver: zodResolver(retentionPolicySchema),
    defaultValues: retentionPolicy,
    mode: 'onChange',
  })

  const { mutate: handleApply, isPending } = useMutation({
    mutationKey: alarmQueryKeys.danmakuPurge(),
    mutationFn: async (update: RetentionPolicy) => {
      await partialUpdate(
        produce(data, (draft) => {
          draft.retentionPolicy = update
        })
      )
      reset(update)
    },
    onSuccess: () => {
      toast.success(t('common.success'))
    },
  })

  const { mutate: purgeDanmaku, isPending: isPurgingDanmaku } = useMutation({
    mutationKey: danmakuQueryKeys.all(),
    mutationFn: async () => {
      const res = await chromeRpcClient.danmakuPurgeCache(
        getValues().deleteCommentsAfter
      )
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
      const alarm = await chrome.alarms.get(alarmKeys.PURGE_DANMAKU)
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
                    {retentionPolicy.enabled && nextPurgeTime && (
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
            <Button
              onClick={handleSubmit((update) => handleApply(update))}
              loading={isPending}
              variant="contained"
              disabled={!isDirty}
            >
              {t('common.apply')}
            </Button>
            <Button
              onClick={() => purgeDanmaku()}
              loading={isPurgingDanmaku}
              variant="contained"
              color="error"
              sx={{ ml: 'auto' }}
              disabled={isDirty}
            >
              {t('optionsPage.retentionPolicy.purgeNow')}
            </Button>
          </Stack>
        </Box>
      </OptionsPageLayout>
      <Outlet />
    </>
  )
}

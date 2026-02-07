import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { ExpandMore } from '@mui/icons-material'
import {
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { produce } from 'immer'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router'
import { alarmKeys } from '@/common/alarms/constants'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { OutlineAccordion } from '@/common/components/OutlineAccordion'
import { useToast } from '@/common/components/Toast/toastStore'
import { getAlarm } from '@/common/extension/chromeRuntime'
import type { RetentionPolicy } from '@/common/options/extensionOptions/schema'
import { retentionPolicySchema } from '@/common/options/extensionOptions/schema'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import {
  alarmQueryKeys,
  customEpisodeQueryKeys,
  episodeQueryKeys,
  seasonMapQueryKeys,
  seasonQueryKeys,
} from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'

function useWipeDanmakuStorage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      includeCustomEpisodes,
    }: {
      includeCustomEpisodes: boolean
    }) => {
      await chromeRpcClient.dataWipeDanmaku({ includeCustomEpisodes })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: episodeQueryKeys.all(),
      })
      queryClient.invalidateQueries({
        queryKey: seasonQueryKeys.all(),
      })
      queryClient.invalidateQueries({
        queryKey: seasonMapQueryKeys.all(),
      })
      queryClient.invalidateQueries({
        queryKey: customEpisodeQueryKeys.all(),
      })
    },
  })
}

export const RetentionPolicyPage = () => {
  const { t } = useTranslation()
  const { data, partialUpdate } = useExtensionOptions()

  const { retentionPolicy } = data

  const { toast } = useToast()
  const dialog = useDialog()

  const {
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isDirty },
  } = useForm<RetentionPolicy>({
    resolver: standardSchemaResolver(retentionPolicySchema),
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
      toast.success(t('common.success', 'Success'))
    },
  })

  const { mutate: purgeDanmaku, isPending: isPurgingDanmaku } = useMutation({
    mutationKey: episodeQueryKeys.all(),
    mutationFn: async () => {
      const res = await chromeRpcClient.danmakuPurgeCache(
        getValues().deleteCommentsAfter
      )
      return res.data
    },
    onSuccess: (count) => {
      toast.success(
        t(
          'optionsPage.retentionPolicy.alert.nDanmakuDeleted',
          '{{count}} danmaku deleted',
          {
            count,
          }
        )
      )
    },
  })

  const { mutate: wipeData, isPending: isWiping } = useWipeDanmakuStorage()

  const handleWipeData = () => {
    let includeCustomEpisodes = false

    dialog.delete({
      title: t(
        'optionsPage.dataManagement.wipeDanmakuData',
        'Wipe Danmaku Data'
      ),
      content: (
        <>
          <Typography color="text.secondary">
            {t(
              'optionsPage.dataManagement.wipeData.confirm1',
              'Are you sure you want to wipe all danmaku, seasons, and mapping data? This action cannot be undone.'
            )}
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                onChange={(e) => {
                  includeCustomEpisodes = e.target.checked
                }}
              />
            }
            label={t(
              'optionsPage.dataManagement.wipeData.includeCustomEpisodes',
              'Include custom episodes'
            )}
          />
        </>
      ),
      onConfirm: () => {
        dialog.delete({
          title: t(
            'optionsPage.dataManagement.wipeDanmakuData',
            'Wipe Danmaku Data'
          ),
          content: t(
            'optionsPage.dataManagement.wipeData.confirm2',
            'Are you sure? This action cannot be undone.'
          ),
          onConfirm: () =>
            wipeData(
              { includeCustomEpisodes },
              { onSuccess: () => toast.success(t('common.success', 'Success')) }
            ),
          confirmButtonProps: { sx: { order: -1 }, color: 'error' },
          cancelButtonProps: { sx: { ml: 1 } },
        })
      },
    })
  }

  const { data: nextPurgeTime } = useQuery({
    queryKey: alarmQueryKeys.danmakuPurge(),
    queryFn: async () => {
      const alarm = await getAlarm(alarmKeys.PURGE_DANMAKU)
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
        <OptionsPageToolBar
          title={t('optionsPage.pages.dataManagement', 'Data Management')}
        />
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
                    <>
                      {t(
                        'optionsPage.retentionPolicy.enabled',
                        'Enable Retention Policy'
                      )}
                    </>
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
                    <>
                      {t(
                        'optionsPage.retentionPolicy.deleteCommentsAfter',
                        'Delete comments older than'
                      )}
                    </>
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
                                      count: Number.parseInt(`${field.value}`),
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
                    <>
                      {t(
                        'optionsPage.retentionPolicy.tooltip.deleteCommentsAfter'
                      )}
                    </>
                    {retentionPolicy.enabled && nextPurgeTime && (
                      <>
                        {t(
                          'optionsPage.retentionPolicy.tooltip.nextPurge',
                          'Next purge at {{time}}',
                          {
                            time: nextPurgeTime,
                          }
                        )}
                      </>
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
              {t('common.apply', 'Apply')}
            </Button>
            <Button
              onClick={() => purgeDanmaku()}
              loading={isPurgingDanmaku}
              variant="contained"
              color="error"
              sx={{ ml: 'auto' }}
              disabled={isDirty}
            >
              {t('optionsPage.retentionPolicy.purgeNow', 'Purge Now')}
            </Button>
          </Stack>

          <Box mt={4}>
            <OutlineAccordion disableGutters elevation={0}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography>{t('common.advanced', 'Advanced')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography variant="body1">
                    {t(
                      'optionsPage.dataManagement.wipeDanmakuData',
                      'Wipe Danmaku Data'
                    )}
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    color="error"
                    onClick={handleWipeData}
                    loading={isWiping}
                  >
                    {t(
                      'optionsPage.dataManagement.wipeDanmakuData',
                      'Wipe Danmaku Data'
                    )}
                  </Button>
                </Stack>
              </AccordionDetails>
            </OutlineAccordion>
          </Box>
        </Box>
      </OptionsPageLayout>
      <Outlet />
    </>
  )
}

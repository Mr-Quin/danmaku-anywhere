import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { DeleteOutlined, ExpandMore, WarningAmber } from '@mui/icons-material'
import {
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { produce } from 'immer'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router'
import { alarmKeys } from '@/common/alarms/constants'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { OutlineAccordion } from '@/common/components/OutlineAccordion'
import { useToast } from '@/common/components/Toast/toastStore'
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
import {
  SettingsGroup,
  SettingsGroupLabel,
  SettingsToggleRow,
} from '@/popup/pages/options/components/settings/SettingsGroup'

function useWipeDanmakuStorage() {
  return useMutation({
    mutationFn: async ({
      includeCustomEpisodes,
    }: {
      includeCustomEpisodes: boolean
    }) => {
      await chromeRpcClient.dataWipeDanmaku({ includeCustomEpisodes })
    },
    meta: {
      invalidates: [
        episodeQueryKeys.all(),
        seasonQueryKeys.all(),
        seasonMapQueryKeys.all(),
        customEpisodeQueryKeys.all(),
      ],
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
    meta: {
      invalidates: [alarmQueryKeys.danmakuPurge()],
    },
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
    meta: {
      invalidates: [episodeQueryKeys.all(), seasonQueryKeys.all()],
    },
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
          <Typography
            sx={{
              color: 'text.secondary',
            }}
          >
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
      const { data: alarm } = await chromeRpcClient.getAlarm(
        alarmKeys.PURGE_DANMAKU
      )
      return alarm
    },
    select: (data) => {
      return data ? new Date(data.scheduledTime).toLocaleString() : null
    },
    enabled: data.retentionPolicy.enabled,
  })

  return (
    <>
      <OptionsPageLayout>
        <OptionsPageToolBar
          title={t('optionsPage.pages.dataManagement', 'Data Management')}
        />

        <SettingsGroupLabel>
          {t('optionsPage.retentionPolicy.title', 'Retention policy')}
        </SettingsGroupLabel>
        <SettingsGroup>
          <Controller
            name="enabled"
            control={control}
            render={({ field: { onChange, value } }) => (
              <SettingsToggleRow
                title={t(
                  'optionsPage.retentionPolicy.enabled',
                  'Enable Retention Policy'
                )}
                subtitle={t(
                  'optionsPage.retentionPolicy.enabledDesc',
                  'Automatically purge comments older than the limit below.'
                )}
                checked={value}
                onToggle={onChange}
              />
            )}
          />
        </SettingsGroup>

        <Box sx={{ px: 2, mt: 1.75 }}>
          <Typography
            variant="overline"
            sx={{ display: 'block', color: 'text.secondary', mb: 0.5 }}
          >
            {t(
              'optionsPage.retentionPolicy.deleteCommentsAfter',
              'Delete comments older than'
            )}
          </Typography>
          <Controller
            name="deleteCommentsAfter"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
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
            )}
          />
          {retentionPolicy.enabled && nextPurgeTime && (
            <Typography
              variant="caption"
              sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}
            >
              {t(
                'optionsPage.retentionPolicy.tooltip.nextPurge',
                'Next purge at {{time}}',
                { time: nextPurgeTime }
              )}
            </Typography>
          )}

          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button
              onClick={handleSubmit((update) => handleApply(update))}
              loading={isPending}
              variant="contained"
              disabled={!isDirty}
              sx={{ flex: 1 }}
            >
              {t('common.apply', 'Apply')}
            </Button>
            <Button
              onClick={() => purgeDanmaku()}
              loading={isPurgingDanmaku}
              variant="outlined"
              color="error"
              disabled={isDirty}
              startIcon={<DeleteOutlined />}
              sx={{ flex: 1 }}
            >
              {t('optionsPage.retentionPolicy.purgeNow', 'Purge Now')}
            </Button>
          </Stack>
        </Box>

        <Box sx={{ px: 1.5, mt: 2.5, pb: 2 }}>
          <OutlineAccordion
            disableGutters
            elevation={0}
            sx={{ borderColor: 'error.main' }}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <WarningAmber color="error" fontSize="small" />
                <Typography sx={{ fontWeight: 600, color: 'error.main' }}>
                  {t('optionsPage.dataManagement.dangerZone', 'Danger zone')}
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Typography
                variant="body2"
                sx={{ color: 'text.secondary', mb: 1.5 }}
              >
                {t(
                  'optionsPage.dataManagement.wipeData.description',
                  'Permanently delete all stored danmaku. This cannot be undone.'
                )}
              </Typography>
              <Button
                fullWidth
                variant="contained"
                color="error"
                onClick={handleWipeData}
                loading={isWiping}
                startIcon={<DeleteOutlined />}
              >
                {t(
                  'optionsPage.dataManagement.wipeDanmakuData',
                  'Wipe Danmaku Data'
                )}
              </Button>
            </AccordionDetails>
          </OutlineAccordion>
        </Box>
      </OptionsPageLayout>
      <Outlet />
    </>
  )
}

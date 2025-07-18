import { zodResolver } from '@hookform/resolvers/zod'
import {
  Box,
  Button,
  Collapse,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  List,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { produce } from 'immer'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { ExternalLink } from '@/common/components/ExternalLink'
import { useToast } from '@/common/components/Toast/toastStore'
import {
  DanmakuSourceType,
  localizedDanmakuSourceType,
} from '@/common/danmaku/enums'
import { ChConvertList } from '@/common/options/extensionOptions/constant'
import type { DanmakuSources } from '@/common/options/extensionOptions/schema'
import { danmakuSourcesSchema } from '@/common/options/extensionOptions/schema'
import { useDanmakuSources } from '@/common/options/extensionOptions/useDanmakuSources'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { ToggleListItemButton } from '@/popup/pages/options/components/ToggleListItemButton'
import { useToggleBilibili } from '@/popup/pages/options/pages/danmakuSource/hooks/useToggleBilibili'
import { useToggleTencent } from '@/popup/pages/options/pages/danmakuSource/hooks/useToggleTencent'

export const DanmakuSource = () => {
  const { t } = useTranslation()
  const { sourcesList, toggle, isPending, update } = useDanmakuSources()
  const { data, partialUpdate } = useExtensionOptions()
  const { toast } = useToast()

  const {
    toggle: toggleBilibili,
    isLoading: isBilibiliLoading,
    loginStatus,
  } = useToggleBilibili()

  const {
    toggle: toggleTencent,
    isLoading: isTencentLoading,
    canEnable,
  } = useToggleTencent()

  const isAnyLoading =
    isPending || update.isPending || isBilibiliLoading || isTencentLoading

  // State for expanded sections
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({})

  // Form for bilibili options
  const bilibiliForm = useForm({
    resolver: zodResolver(danmakuSourcesSchema),
    values: data.danmakuSources,
    defaultValues: data.danmakuSources,
    mode: 'onChange',
  })

  // Form for dandanplay options
  const dandanplayForm = useForm({
    resolver: zodResolver(danmakuSourcesSchema),
    defaultValues: data.danmakuSources,
    values: data.danmakuSources,
    mode: 'onChange',
  })

  // Bilibili mutation
  const bilibiliMutation = useMutation({
    mutationFn: async (update: DanmakuSources) => {
      await partialUpdate(
        produce(data, (draft) => {
          draft.danmakuSources.bilibili = update.bilibili
        })
      )
    },
    onSuccess: () => {
      toast.success(t('common.success'))
    },
  })

  // DanDanPlay mutation
  const dandanplayMutation = useMutation({
    mutationFn: async (update: DanmakuSources) => {
      await partialUpdate(
        produce(data, (draft) => {
          draft.danmakuSources.dandanplay = update.dandanplay
        })
      )
    },
    onSuccess: () => {
      toast.success(t('common.success'))
    },
  })

  // Auto-submit for DanDanPlay
  const dandanplayFormData = dandanplayForm.watch()
  useEffect(() => {
    if (
      dandanplayForm.formState.isDirty &&
      !dandanplayForm.formState.isSubmitted
    ) {
      dandanplayForm.handleSubmit((data) => {
        dandanplayMutation.mutate(data)
      })()
    }
  }, [dandanplayFormData])

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const getOptionProps = (key: string) => {
    if (key === 'bilibili') {
      return {
        isLoading: isBilibiliLoading,
        onToggle: toggleBilibili,
        showWarning: loginStatus?.isLogin === false,
        warningTooltip: (
          <>
            <Typography variant="subtitle2">
              {/* @ts-ignore */}
              <Trans i18nKey="danmakuSource.tooltip.bilibiliNotLoggedIn">
                <ExternalLink
                  color="primary"
                  to="https://www.bilibili.com"
                  target="_blank"
                  rel="noreferrer"
                />
              </Trans>
            </Typography>
          </>
        ),
      }
    }
    if (key === 'tencent') {
      return {
        isLoading: isTencentLoading,
        onToggle: toggleTencent,
        disableToggle: !canEnable || isAnyLoading,
        showWarning: !canEnable,
        warningTooltip: (
          <Typography variant="subtitle2">
            {/* @ts-ignore */}
            <Trans i18nKey="danmakuSource.tooltip.tencentCookieMissing">
              <ExternalLink
                color="primary"
                to="https://v.qq.com"
                target="_blank"
                rel="noreferrer"
              />
            </Trans>
          </Typography>
        ),
      }
    }
    return {}
  }

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title={t('optionsPage.pages.danmakuSource')} />
      <List disablePadding>
        {sourcesList.map(({ key, options, provider }) => {
          const isExpanded = expandedSections[key]
          const hasAdvancedOptions = key === 'bilibili' || key === 'dandanplay'

          return (
            <Box key={key}>
              <ToggleListItemButton
                enabled={options.enabled}
                disableToggle={isAnyLoading}
                onClick={() => {
                  if (hasAdvancedOptions) {
                    toggleSection(key)
                  }
                }}
                onToggle={(checked) => {
                  void toggle(key, checked)
                }}
                itemText={t(localizedDanmakuSourceType(provider))}
                isLoading={isPending}
                {...getOptionProps(key)}
              />

              {/* Bilibili Advanced Options */}
              {key === 'bilibili' && (
                <Collapse in={isExpanded}>
                  <Box px={2} py={1}>
                    <Typography variant="subtitle2" gutterBottom>
                      {t(
                        localizedDanmakuSourceType(DanmakuSourceType.Bilibili)
                      )}{' '}
                      {t('optionsPage.advanced', 'Advanced Options')}
                    </Typography>
                    <Stack gap={2}>
                      <FormControl>
                        <FormLabel>
                          {t(
                            'optionsPage.danmakuSource.bilibili.danmakuTypePreference'
                          )}
                        </FormLabel>
                        <Controller
                          name="bilibili.danmakuTypePreference"
                          control={bilibiliForm.control}
                          render={({ field }) => {
                            return (
                              <RadioGroup
                                row
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e)
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
                      <Box>
                        <Button
                          onClick={bilibiliForm.handleSubmit((d) => {
                            bilibiliMutation.mutate(d)
                          })}
                          variant="contained"
                          sx={{
                            mr: 1,
                          }}
                          disabled={!bilibiliForm.formState.isDirty}
                        >
                          {t('common.apply')}
                        </Button>
                      </Box>
                    </Stack>
                  </Box>
                  <Divider />
                </Collapse>
              )}

              {/* DanDanPlay Advanced Options */}
              {key === 'dandanplay' && (
                <Collapse in={isExpanded}>
                  <Box px={2} py={1}>
                    <Typography variant="subtitle2" gutterBottom>
                      {t(
                        localizedDanmakuSourceType(DanmakuSourceType.DanDanPlay)
                      )}{' '}
                      {t('optionsPage.advanced', 'Advanced Options')}
                    </Typography>
                    <Stack mt={2} gap={2}>
                      <Controller
                        name="dandanplay.chConvert"
                        control={dandanplayForm.control}
                        render={({ field }) => {
                          return (
                            <TextField
                              {...field}
                              select
                              fullWidth
                              label={t('optionsPage.chConvert.name')}
                              error={
                                !!dandanplayForm.formState.errors.dandanplay
                                  ?.chConvert
                              }
                              helperText={
                                dandanplayForm.formState.errors.dandanplay
                                  ?.chConvert?.message
                              }
                            >
                              {ChConvertList.map((option) => (
                                <MenuItem
                                  value={option.value}
                                  key={option.label}
                                >
                                  {t(option.label)}
                                </MenuItem>
                              ))}
                            </TextField>
                          )
                        }}
                      />
                    </Stack>
                  </Box>
                  <Divider />
                </Collapse>
              )}
            </Box>
          )
        })}
      </List>
    </OptionsPageLayout>
  )
}

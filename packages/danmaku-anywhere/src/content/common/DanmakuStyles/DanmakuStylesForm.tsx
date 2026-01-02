import {
  Collapse,
  Divider,
  debounce,
  Grid,
  Input,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { DocIcon } from '@/common/components/DocIcon'
import { getScrollBarProps } from '@/common/components/layout/ScrollBox'
import { IS_CHROME } from '@/common/constants'
import { usePlatformInfo } from '@/common/hooks/usePlatformInfo'
import { useResetForm } from '@/common/hooks/useResetForm'
import type { DanmakuOptions } from '@/common/options/danmakuOptions/constant'
import { useDanmakuOptions } from '@/common/options/danmakuOptions/useDanmakuOptions'
import { withStopPropagation } from '@/common/utils/withStopPropagation'
import { FontSelector } from '@/content/common/DanmakuStyles/FontSelector'
import { LabeledSwitch } from '@/content/common/DanmakuStyles/LabeledSwitch'
import { LabeledSlider } from './LabeledSlider'

const opacityMarks = [
  {
    value: 0,
    label: '0%',
  },
  {
    value: 0.5,
    label: '50%',
  },
  {
    value: 1,
    label: '100%',
  },
]

const fontSizeMarks = [
  {
    value: 4,
    label: '4px',
  },
  {
    value: 24,
    label: '24px',
  },
  {
    value: 48,
    label: '48px',
  },
]

const maxOnScreenMarks = [
  {
    value: 0,
    label: '0',
  },
  {
    value: 1000,
    label: '1000',
  },
]

const trackHeightMarks = [
  {
    value: 12,
    label: '12',
  },
  {
    value: 60,
    label: '60',
  },
]

const speedMarks = [
  {
    value: 1,
    label: '1',
  },
  {
    value: 2,
    label: '2',
  },
  {
    value: 3,
    label: '3',
  },
  {
    value: 4,
    label: '4',
  },
  {
    value: 5,
    label: '5',
  },
]

const safeZoneMarks = [
  {
    value: 0,
    label: '0%',
  },
  {
    value: 50,
    label: '50%',
  },
  {
    value: 100,
    label: '100%',
  },
]

const intervalMarks = [
  {
    value: 100,
    label: '100ms',
  },
  {
    value: 500,
    label: '500ms',
  },
  {
    value: 1000,
    label: '1000ms',
  },
]

const overlapMarks = [
  {
    value: 0,
    label: '0%',
  },
  {
    value: 100,
    label: '100%',
  },
  {
    value: 200,
    label: '200%',
  },
  {
    value: 300,
    label: '300%',
  },
  {
    value: 400,
    label: '400%',
  },
]

const customCssPlaceholder = `.da-danmaku {
  color: red;
  font-weight: bold;
}`

const opacityValueLabelFormat = (value: number) => `${value * 100}%`

const fontSizeValueLabelFormat = (value: number) => `${value}px`

const safeZoneValueLabelFormat = (value: number) => `${value}%`

const offsetValueLabelFormat = (value: number) => {
  return `${value > 0 ? '+' : ''}${value}ms`
}

const convertActualSpeedToDisplay = (actualSpeed: number) => {
  // convert actual playback rate to a number between 1 and 5
  switch (actualSpeed) {
    case 0.5:
      return 1
    case 0.75:
      return 2
    case 1:
      return 3
    case 1.5:
      return 4
    case 2:
      return 5
    default:
      return 3
  }
}

const convertDisplaySpeedToActual = (displaySpeed: number) => {
  switch (displaySpeed) {
    case 1:
      return 0.5
    case 2:
      return 0.75
    case 3:
      return 1
    case 4:
      return 1.5
    case 5:
      return 2
    default:
      return 1
  }
}

export type SaveStatus = 'idle' | 'saving' | 'saved'

export type DanmakuStylesFormProps = {
  onSaveStatusChange?: (status: SaveStatus) => void
}

export const DanmakuStylesForm = ({
  onSaveStatusChange,
}: DanmakuStylesFormProps) => {
  const { t } = useTranslation()
  const { data: config, partialUpdate } = useDanmakuOptions()
  const { isMobile } = usePlatformInfo()

  const form = useForm<DanmakuOptions>({
    defaultValues: config,
    mode: 'onChange',
  })

  const { control, setValue, getValues, watch, handleSubmit, subscribe } = form

  const onSave = async (formData: DanmakuOptions) => {
    onSaveStatusChange?.('saving')

    await partialUpdate(formData)

    onSaveStatusChange?.('saved')
  }

  const resetFlag = useResetForm({
    form,
    data: config,
  })

  useEffect(() => {
    const debouncedSave = debounce(() => {
      handleSubmit(onSave)()
    }, 500)

    const unsubscribe = subscribe({
      formState: {
        values: true,
        isDirty: true,
      },
      callback: ({ isDirty }) => {
        if (!isDirty || resetFlag.current) {
          return
        }
        onSaveStatusChange?.('saving')
        debouncedSave()
      },
    })

    return () => {
      unsubscribe()
    }
  }, [subscribe])

  const yStart = watch('area.yStart', config.area.yStart)
  const yEnd = watch('area.yEnd', config.area.yEnd)
  const useCustomCss = watch('useCustomCss', config.useCustomCss)

  return (
    <>
      <Stack spacing={1} mt={2}>
        <Typography variant="h6" fontSize={18} component="div">
          {t('stylePage.style', 'Style')}
        </Typography>
        <Divider />
        <Controller
          name="style.opacity"
          control={control}
          render={({ field }) => (
            <LabeledSlider
              label={t('stylePage.opacity', 'Opacity')}
              value={field.value}
              onChange={(_e, newValue) => field.onChange(newValue as number)}
              step={0.01}
              min={0}
              max={1}
              size="small"
              valueLabelDisplay="auto"
              marks={opacityMarks}
              valueLabelFormat={opacityValueLabelFormat}
            />
          )}
        />
        <Controller
          name="style.fontSize"
          control={control}
          render={({ field }) => (
            <LabeledSlider
              label={t('stylePage.size', 'Size')}
              value={field.value}
              onChange={(_e, newValue) => field.onChange(newValue as number)}
              step={1}
              min={4}
              max={48}
              size="small"
              valueLabelDisplay="auto"
              marks={fontSizeMarks}
              valueLabelFormat={fontSizeValueLabelFormat}
            />
          )}
        />
        {!isMobile && IS_CHROME && (
          <Controller
            name="style.fontFamily"
            control={control}
            render={({ field }) => (
              <FontSelector
                value={field.value}
                onChange={(font) => field.onChange(font)}
                label={t('stylePage.font', 'Font')}
              />
            )}
          />
        )}
        <Controller
          name="useCustomCss"
          control={control}
          render={({ field }) => (
            <LabeledSwitch
              label={
                <Stack
                  component="span"
                  direction="row"
                  alignItems="center"
                  gap={1}
                >
                  {t('stylePage.useCustomCss', 'Use Custom CSS')}
                  <DocIcon path="docs/custom-css" />
                </Stack>
              }
              edge="end"
              checked={field.value}
              onChange={(e) => field.onChange(e.target.checked)}
            />
          )}
        />
        <Collapse in={useCustomCss} unmountOnExit>
          <Controller
            name="customCss"
            control={control}
            render={({ field }) => (
              <TextField
                placeholder={customCssPlaceholder}
                helperText={t(
                  'stylePage.customCssDescription',
                  'Custom CSS rules applied to every danmaku. These override other style settings.'
                )}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value)}
                multiline
                minRows={3}
                maxRows={10}
                size="small"
                fullWidth
                slotProps={{
                  input: {
                    sx: (theme) => ({
                      fontFamily: 'monospace',
                      fontSize: theme.typography.body2.fontSize,
                      '& .MuiInputBase-input': {
                        ...getScrollBarProps(theme),
                      },
                    }),
                  },
                }}
              />
            )}
          />
        </Collapse>
      </Stack>

      <Stack spacing={1} mt={2}>
        <Typography variant="h6" fontSize={18} component="div">
          {t('stylePage.speedSettings', 'Speed Settings')}
        </Typography>
        <Divider />
        <Controller
          name="speed"
          control={control}
          render={({ field }) => (
            <LabeledSlider
              label={t('stylePage.speed', 'Speed')}
              value={convertActualSpeedToDisplay(field.value)}
              onChange={(_e, newValue) => {
                field.onChange(convertDisplaySpeedToActual(newValue as number))
              }}
              step={1}
              min={1}
              max={5}
              marks={speedMarks}
              size="small"
              valueLabelDisplay="auto"
            />
          )}
        />
        <Controller
          name="offset"
          control={control}
          render={({ field }) => {
            const [isEditingOffset, setIsEditingOffset] = useState(false)
            const [editOffsetValue, setEditOffsetValue] = useState<string>(
              field.value.toString()
            )

            useEffect(() => {
              if (!isEditingOffset) {
                setEditOffsetValue(field.value.toString())
              }
            }, [field.value, isEditingOffset])

            const handleOffsetBlur = () => {
              setIsEditingOffset(false)
              let numericValue = Number.parseInt(editOffsetValue, 10)
              if (isNaN(numericValue)) {
                numericValue = field.value ?? 0
              }
              if (numericValue !== field.value) {
                field.onChange(numericValue)
              }
              setEditOffsetValue(numericValue.toString())
            }

            return (
              <LabeledSlider
                label={t('stylePage.offset', 'Time Offset (milliseconds)')}
                tooltip={t(
                  'stylePage.tooltip.offset',
                  'How earlier danmaku appears. Positive values make danmaku appear later, negative values make danmaku appear earlier.'
                )}
                value={field.value}
                onChange={(_e, newValue) => {
                  const numericValue = newValue as number
                  field.onChange(numericValue)
                  if (!isEditingOffset) {
                    setEditOffsetValue(numericValue.toString())
                  }
                }}
                gridSize={8}
                step={10}
                min={-5000}
                max={5000}
                size="small"
                valueLabelDisplay="auto"
                valueLabelFormat={offsetValueLabelFormat}
              >
                <Grid size={4}>
                  <Input
                    value={isEditingOffset ? editOffsetValue : field.value}
                    size="small"
                    {...withStopPropagation()}
                    onFocus={() => {
                      setIsEditingOffset(true)
                      setEditOffsetValue(field.value.toString())
                    }}
                    onBlur={handleOffsetBlur}
                    onChange={(e) => {
                      setEditOffsetValue(e.target.value)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleOffsetBlur()
                        ;(e.target as HTMLInputElement).blur()
                      }
                    }}
                    inputProps={{
                      step: 1,
                      type: 'number',
                    }}
                  />
                </Grid>
              </LabeledSlider>
            )
          }}
        />
        <Controller
          name="interval"
          control={control}
          render={({ field }) => (
            <LabeledSlider
              label={t('stylePage.interval', 'Emission Interval')}
              tooltip={t(
                'stylePage.tooltip.interval',
                'Lower value means more densely packed danmaku. May cause performance issues if set too low.'
              )}
              value={field.value}
              onChange={(_e, newValue) => field.onChange(newValue as number)}
              step={10}
              min={100}
              max={1000}
              marks={intervalMarks}
              size="small"
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}ms`}
            />
          )}
        />
      </Stack>

      <Stack spacing={1} mt={2}>
        <Typography variant="h6" fontSize={18} component="div">
          {t('stylePage.safeZones', 'Display Area')}
        </Typography>
        <Divider />
        <LabeledSlider
          label={t('stylePage.safeZone.y', 'Y-axis display range')}
          tooltip={t(
            'stylePage.tooltip.safeZone.y',
            'Y-axis (up and down) display range'
          )}
          value={[yStart, yEnd]}
          onChange={(_e, newValue, activeThumb) => {
            if (!Array.isArray(newValue)) return

            const minDist = 10
            const minVal = 0
            const maxVal = 100

            const currentYStart = getValues('area.yStart')
            const currentYEnd = getValues('area.yEnd')

            if (activeThumb === 0) {
              const updatedYStart = Math.max(
                minVal,
                Math.min(newValue[0], currentYEnd - minDist)
              )
              setValue('area.yStart', updatedYStart, { shouldDirty: true })
            } else {
              const updatedYEnd = Math.min(
                maxVal,
                Math.max(newValue[1], currentYStart + minDist)
              )
              setValue('area.yEnd', updatedYEnd, { shouldDirty: true })
            }
          }}
          step={1}
          min={0}
          max={100}
          size="small"
          valueLabelDisplay="auto"
          marks={safeZoneMarks}
          valueLabelFormat={safeZoneValueLabelFormat}
          disableSwap
        />
        <Controller
          name="trackHeight"
          control={control}
          render={({ field }) => (
            <LabeledSlider
              label={t('stylePage.trackHeight', 'Track Height')}
              tooltip={t(
                'stylePage.tooltip.trackHeight',
                'Higher values makes danmaku farther apart'
              )}
              value={field.value}
              onChange={(_e, newValue) => field.onChange(newValue as number)}
              step={1}
              min={12}
              max={60}
              marks={trackHeightMarks}
              size="small"
              valueLabelDisplay="auto"
            />
          )}
        />
        <Controller
          name="maxOnScreen"
          control={control}
          render={({ field }) => (
            <LabeledSlider
              label={t('stylePage.maxOnScreen', 'Maximum Limit')}
              tooltip={t(
                'stylePage.tooltip.maxOnScreen',
                'The maximum number of danmaku that can be displayed on the screen at the same time.'
              )}
              value={field.value}
              onChange={(_e, newValue) => field.onChange(newValue as number)}
              step={1}
              min={0}
              max={1000}
              marks={maxOnScreenMarks}
              size="small"
              valueLabelDisplay="auto"
            />
          )}
        />
        <Controller
          name="overlap"
          control={control}
          render={({ field }) => (
            <LabeledSlider
              label={t('stylePage.overlap', 'Overlap')}
              tooltip={t(
                'stylePage.tooltip.overlap',
                'Higher values reduce the distance between danmaku, allowing more danmaku to be displayed on the screen at the same time, at the cost of overlapping. Set to 0 to disable overlap.'
              )}
              value={field.value ?? 0}
              onChange={(_e, newValue) => field.onChange(newValue as number)}
              step={1}
              min={0}
              max={400}
              marks={overlapMarks}
              size="small"
              valueLabelDisplay="auto"
              valueLabelFormat={safeZoneValueLabelFormat}
            />
          )}
        />
        <Controller
          name="distribution"
          control={control}
          render={({ field }) => (
            <Stack
              spacing={1}
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <div>
                <Typography gutterBottom>
                  {t('stylePage.distribution', 'Distribution')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t(
                    'stylePage.tooltip.distribution',
                    'Random: danmaku will be distributed uniformly. Order: danmaku will fill the screen from top to bottom.'
                  )}
                </Typography>
              </div>
              <ToggleButtonGroup
                value={field.value}
                onChange={(e, newValue) => {
                  if (newValue) {
                    field.onChange(newValue)
                  }
                }}
                size="small"
                color="primary"
                exclusive
                sx={{
                  flex: '1 0 auto',
                }}
              >
                <ToggleButton value="random">
                  {t('stylePage.randomDistribution', 'Random')}
                </ToggleButton>
                <ToggleButton value="order">
                  {t('stylePage.orderDistribution', 'Order')}
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          )}
        />
      </Stack>

      <Stack spacing={1} mt={2}>
        <Typography variant="h6" fontSize={18} component="div">
          {t('stylePage.specialDanmaku', 'Special Danmaku')}
        </Typography>
        <Divider />
        <Controller
          name="specialComments.top"
          control={control}
          render={({ field }) => (
            <LabeledSwitch
              label={t('stylePage.specialDanmakuConfig.showTop', 'Top Danmaku')}
              tooltip={t(
                'stylePage.tooltip.specialDanmaku',
                'When off, danmaku will be shown as normal scrolling danmaku'
              )}
              checked={field.value === 'normal'}
              onChange={(e) => {
                field.onChange(e.target.checked ? 'normal' : 'scroll')
              }}
            />
          )}
        />
        <Controller
          name="specialComments.bottom"
          control={control}
          render={({ field }) => (
            <LabeledSwitch
              label={t(
                'stylePage.specialDanmakuConfig.showBottom',
                'Bottom Danmaku'
              )}
              tooltip={t(
                'stylePage.tooltip.specialDanmaku',
                'When off, danmaku will be shown as normal scrolling danmaku'
              )}
              checked={field.value === 'normal'}
              onChange={(e) => {
                field.onChange(e.target.checked ? 'normal' : 'scroll')
              }}
            />
          )}
        />
      </Stack>
    </>
  )
}

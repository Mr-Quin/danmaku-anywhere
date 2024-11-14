import { LoadingButton } from '@mui/lab'
import {
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  Input,
  Stack,
  Typography,
} from '@mui/material'
import type { Draft } from 'immer'
import { produce } from 'immer'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LabeledSlider } from '@/common/components/LabeledSlider'
import type { DanmakuOptions } from '@/common/options/danmakuOptions/constant'
import { useDanmakuOptions } from '@/common/options/danmakuOptions/useDanmakuOptions'

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

const limitPerSecMarks = [
  {
    value: 0,
    label: '0',
  },
  {
    value: 50,
    label: '50',
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

const distributeSafeZone = (
  top: number,
  bottom: number,
  change: 'top' | 'bottom'
) => {
  if (top + bottom <= 100) {
    return [top, bottom]
  }
  if (change === 'top') {
    return [top, 100 - top]
  }
  return [100 - bottom, bottom]
}

export const DanmakuStylesForm = () => {
  const { t } = useTranslation()
  const {
    data: config,
    partialUpdate,
    update: { isPending },
  } = useDanmakuOptions()

  const [localConfig, setLocalConfig] = useState<DanmakuOptions>(config)
  const [offsetInput, setOffsetInput] = useState<string>('')
  const [offsetInputActive, setOffsetInputActive] = useState(false)

  useEffect(() => {
    setLocalConfig(config)
  }, [config])

  const flushUpdate = async (newConfig: DanmakuOptions) => {
    // flush config to storage
    return partialUpdate(newConfig)
  }

  const handleLocalUpdate = (
    updater: (draft: Draft<DanmakuOptions>) => void
  ) => {
    setLocalConfig(produce(localConfig, updater))
  }

  return (
    <>
      <Stack spacing={1} mt={2}>
        <LabeledSlider
          label={t('stylePage.opacity')}
          tooltip={t('stylePage.tooltip.opacity')}
          value={localConfig.style.opacity}
          onChange={(e, newValue) =>
            handleLocalUpdate((draft) => {
              draft.style.opacity = newValue as number
            })
          }
          step={0.01}
          min={0}
          max={1}
          size="small"
          valueLabelDisplay="auto"
          marks={opacityMarks}
          valueLabelFormat={opacityValueLabelFormat}
        />
        <LabeledSlider
          label={t('stylePage.size')}
          tooltip={t('stylePage.tooltip.size')}
          value={localConfig.style.fontSize}
          onChange={(e, newValue) =>
            handleLocalUpdate((draft) => {
              draft.style.fontSize = newValue as number
            })
          }
          step={1}
          min={4}
          max={48}
          size="small"
          valueLabelDisplay="auto"
          marks={fontSizeMarks}
          valueLabelFormat={fontSizeValueLabelFormat}
        />
        <LabeledSlider
          label={t('stylePage.limitPerSecond')}
          tooltip={t('stylePage.tooltip.limitPerSecond')}
          disabled={localConfig.limitPerSec === -1}
          value={localConfig.limitPerSec === -1 ? 0 : localConfig.limitPerSec}
          onChange={(e, newValue) =>
            handleLocalUpdate((draft) => {
              draft.limitPerSec = newValue as number
            })
          }
          step={1}
          min={0}
          max={50}
          marks={limitPerSecMarks}
          size="small"
          valueLabelDisplay="auto"
        >
          <Grid item xs={4}>
            <FormControl>
              <FormControlLabel
                sx={{ whiteSpace: 'nowrap' }}
                control={
                  <Checkbox
                    checked={localConfig.limitPerSec === -1}
                    onChange={(e) => {
                      const checked = e.target.checked
                      handleLocalUpdate((draft) => {
                        if (checked) {
                          // the magic number to represent no limit, because Infinity is not serializable
                          draft.limitPerSec = -1
                        } else {
                          // restore to previous value if it's not -1
                          draft.limitPerSec =
                            config.limitPerSec === -1 ? 10 : config.limitPerSec
                        }
                      })
                    }}
                  />
                }
                label={t('stylePage.disableLimit')}
              />
            </FormControl>
          </Grid>
        </LabeledSlider>
        <LabeledSlider
          label={t('stylePage.speed')}
          tooltip={t('stylePage.tooltip.speed')}
          value={convertActualSpeedToDisplay(localConfig.speed)}
          onChange={(e, newValue) => {
            handleLocalUpdate((draft) => {
              draft.speed = convertDisplaySpeedToActual(newValue as number)
            })
          }}
          step={1}
          min={1}
          max={5}
          marks={speedMarks}
          size="small"
          valueLabelDisplay="auto"
        />
        <LabeledSlider
          label={t('stylePage.offset')}
          tooltip={t('stylePage.tooltip.offset')}
          value={localConfig.offset}
          onChange={(e, newValue) => {
            handleLocalUpdate((draft) => {
              draft.offset = newValue as number
            })
          }}
          step={10}
          min={-5000}
          max={5000}
          size="small"
          valueLabelDisplay="auto"
          valueLabelFormat={offsetValueLabelFormat}
        >
          <Grid item xs={4}>
            <Input
              value={offsetInputActive ? offsetInput : localConfig.offset}
              size="small"
              onFocus={() => {
                setOffsetInputActive(true)
                setOffsetInput(localConfig.offset.toString())
              }}
              onBlur={() => {
                setOffsetInputActive(false)
                handleLocalUpdate((draft) => {
                  if (offsetInput === '') {
                    draft.offset = 0
                  } else {
                    draft.offset = parseInt(offsetInput, 10)
                  }
                })
              }}
              onChange={(e) => {
                setOffsetInput(e.target.value)
              }}
              inputProps={{
                step: 1,
                type: 'number',
              }}
            />
          </Grid>
        </LabeledSlider>
      </Stack>

      <Stack spacing={1} mt={2}>
        <Typography variant="h6" component="div">
          {t('stylePage.safeZones')}
        </Typography>
        <Divider />
        <LabeledSlider
          label={t('stylePage.safeZone.top')}
          tooltip={t('stylePage.tooltip.safeZone.top')}
          value={localConfig.safeZones.top}
          onChange={(e, newValue) =>
            handleLocalUpdate((draft) => {
              const value = newValue as number
              const bottom = localConfig.safeZones.bottom
              const [newTop, newBottom] = distributeSafeZone(
                value,
                bottom,
                'top'
              )
              draft.safeZones.top = newTop
              draft.safeZones.bottom = newBottom
            })
          }
          step={1}
          min={0}
          max={100}
          size="small"
          valueLabelDisplay="auto"
          marks={safeZoneMarks}
          valueLabelFormat={safeZoneValueLabelFormat}
        />
        <LabeledSlider
          label={t('stylePage.safeZone.bottom')}
          tooltip={t('stylePage.tooltip.safeZone.bottom')}
          value={localConfig.safeZones.bottom}
          onChange={(e, newValue) =>
            handleLocalUpdate((draft) => {
              const value = newValue as number
              const top = localConfig.safeZones.top
              const [newTop, newBottom] = distributeSafeZone(
                top,
                value,
                'bottom'
              )
              draft.safeZones.top = newTop
              draft.safeZones.bottom = newBottom
            })
          }
          step={1}
          min={0}
          max={100}
          size="small"
          valueLabelDisplay="auto"
          marks={safeZoneMarks}
          valueLabelFormat={safeZoneValueLabelFormat}
        />
      </Stack>

      <LoadingButton
        variant="contained"
        onClick={() => flushUpdate(localConfig)}
        disabled={localConfig === config}
        loading={isPending}
        sx={{
          mt: 2,
        }}
      >
        {t('common.apply')}
      </LoadingButton>
    </>
  )
}

import { Divider, Grid, Input, Stack, Typography } from '@mui/material'
import type { Draft } from 'immer'
import { produce } from 'immer'
import { Ref, useEffect, useImperativeHandle, useState } from 'react'
import { useTranslation } from 'react-i18next'

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

export type DanmakuStylesFormApi = {
  save: () => Promise<void>
}

export type DanmakuStylesFormProps = {
  apiRef: Ref<DanmakuStylesFormApi>
}

export const DanmakuStylesForm = ({ apiRef }: DanmakuStylesFormProps) => {
  const { t } = useTranslation()
  const { data: config, partialUpdate } = useDanmakuOptions()

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

  useImperativeHandle(
    apiRef,
    () => {
      return {
        save: async () => {
          await flushUpdate(localConfig)
        },
      }
    },
    [localConfig]
  )

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
          value={localConfig.style.opacity}
          onChange={(_e, newValue) =>
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
          value={localConfig.style.fontSize}
          onChange={(_e, newValue) =>
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
          label={t('stylePage.speed')}
          value={convertActualSpeedToDisplay(localConfig.speed)}
          onChange={(_e, newValue) => {
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
          onChange={(_e, newValue) => {
            handleLocalUpdate((draft) => {
              draft.offset = newValue as number
            })
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
              value={offsetInputActive ? offsetInput : localConfig.offset}
              size="small"
              {...withStopPropagation()}
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
        <FontSelector
          value={localConfig.style.fontFamily}
          onChange={(font) => {
            handleLocalUpdate((draft) => {
              draft.style.fontFamily = font
            })
          }}
          label={t('stylePage.font')}
        />
      </Stack>

      <Stack spacing={1} mt={2}>
        <Typography variant="h6" fontSize={18} component="div">
          {t('stylePage.safeZones')}
        </Typography>
        <Divider />
        <LabeledSlider
          label={t('stylePage.safeZone.y')}
          tooltip={t('stylePage.tooltip.safeZone.y')}
          value={[localConfig.area.yStart, localConfig.area.yEnd]}
          onChange={(_e, newValue, activeThumb) => {
            if (typeof newValue === 'number') {
              return
            }
            const currentValue = [
              localConfig.area.yStart,
              localConfig.area.yEnd,
            ]
            const v =
              activeThumb === 0
                ? [Math.min(newValue[0], currentValue[1] - 10), currentValue[1]]
                : [currentValue[0], Math.max(newValue[1], currentValue[0] + 10)]

            handleLocalUpdate((draft) => {
              draft.area.yStart = v[0]
              draft.area.yEnd = v[1]
            })
          }}
          step={1}
          min={0}
          max={100}
          size="small"
          valueLabelDisplay="auto"
          marks={safeZoneMarks}
          valueLabelFormat={safeZoneValueLabelFormat}
        />
        <LabeledSlider
          label={t('stylePage.trackHeight')}
          tooltip={t('stylePage.tooltip.trackHeight')}
          value={localConfig.trackHeight}
          onChange={(_e, newValue) =>
            handleLocalUpdate((draft) => {
              draft.trackHeight = newValue as number
            })
          }
          step={1}
          min={12}
          max={60}
          marks={trackHeightMarks}
          size="small"
          valueLabelDisplay="auto"
        />
        <LabeledSlider
          label={t('stylePage.maxOnScreen')}
          tooltip={t('stylePage.tooltip.maxOnScreen')}
          value={localConfig.maxOnScreen}
          onChange={(_e, newValue) =>
            handleLocalUpdate((draft) => {
              draft.maxOnScreen = newValue as number
            })
          }
          step={1}
          min={0}
          max={1000}
          marks={maxOnScreenMarks}
          size="small"
          valueLabelDisplay="auto"
        />
        <LabeledSwitch
          label={t('stylePage.allowOverlap')}
          tooltip={t('stylePage.tooltip.allowOverlap')}
          checked={localConfig.allowOverlap}
          onChange={(e) => {
            handleLocalUpdate((draft) => {
              draft.allowOverlap = e.target.checked
            })
          }}
        />
      </Stack>

      <Stack spacing={1} mt={2}>
        <Typography variant="h6" fontSize={18} component="div">
          {t('stylePage.specialDanmaku')}
        </Typography>
        <Divider />
        <LabeledSwitch
          label={t('stylePage.specialDanmaku.showTop')}
          tooltip={t('stylePage.tooltip.specialDanmaku')}
          checked={localConfig.specialComments.top === 'normal'}
          onChange={(e) => {
            handleLocalUpdate((draft) => {
              if (e.target.checked) {
                draft.specialComments.top = 'normal'
              } else {
                draft.specialComments.top = 'scroll'
              }
            })
          }}
        />
        <LabeledSwitch
          label={t('stylePage.specialDanmaku.showBottom')}
          tooltip={t('stylePage.tooltip.specialDanmaku')}
          checked={localConfig.specialComments.bottom === 'normal'}
          onChange={(e) => {
            handleLocalUpdate((draft) => {
              if (e.target.checked) {
                draft.specialComments.bottom = 'normal'
              } else {
                draft.specialComments.bottom = 'scroll'
              }
            })
          }}
        />
      </Stack>
    </>
  )
}

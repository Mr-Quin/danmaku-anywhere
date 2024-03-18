import { LoadingButton } from '@mui/lab'
import type { SliderProps, TypographyProps } from '@mui/material'
import {
  Slider,
  Switch,
  Box,
  FormControlLabel,
  Typography,
  Stack,
  Tooltip,
} from '@mui/material'
import type { Draft } from 'immer'
import { produce } from 'immer'
import { useEffect, useId, useState } from 'react'

import type { DanmakuOptions } from '@/common/constants/danmakuOptions'
import { useDanmakuOptions } from '@/common/hooks/useDanmakuOptions'

const filterMarks = [
  {
    value: 0,
    label: '0',
  },
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
]

const safeZoneValueLabelFormat = (value: number) => `${value}%`

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

interface LabeledSliderProps extends SliderProps {
  label: string
  tooltip?: string
  typographyProps?: TypographyProps
}

const LabeledSlider = ({
  label,
  tooltip,
  typographyProps = {},
  ...rest
}: LabeledSliderProps) => {
  const id = useId()
  return (
    <Box>
      <Tooltip title={tooltip} sx={{ width: 'fit-content' }}>
        <Typography id={id} {...typographyProps}>
          {label}
        </Typography>
      </Tooltip>
      <Slider aria-labelledby={id} {...rest} />
    </Box>
  )
}

export const DanmakuOptionsController = () => {
  const {
    data: config,
    partialUpdate,
    update: { isPending },
  } = useDanmakuOptions()

  const [localConfig, setLocalConfig] = useState<DanmakuOptions>(config)

  const opacitySlider = useId()
  const sizeSlider = useId()
  const filterSlider = useId()

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
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography fontSize={20} color="text.secondary">
          Danmaku Style
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={localConfig.show}
              onChange={(e) =>
                handleLocalUpdate((draft) => {
                  draft.show = e.target.checked
                })
              }
            />
          }
          label="Show Danmaku"
        />
      </Stack>

      <Stack spacing={1} mt={2}>
        <LabeledSlider
          label="Opacity"
          tooltip='"0" means invisible, "1" means fully visible.'
          value={localConfig.style.opacity}
          onChange={(e, newValue) =>
            handleLocalUpdate((draft) => {
              draft.style.opacity = newValue as number
            })
          }
          step={0.01}
          min={0}
          max={1}
          aria-labelledby={opacitySlider}
          size="small"
          valueLabelDisplay="auto"
        />
        <LabeledSlider
          label="Size"
          tooltip="Font size of danmaku."
          value={localConfig.style.fontSize}
          onChange={(e, newValue) =>
            handleLocalUpdate((draft) => {
              draft.style.fontSize = newValue as number
            })
          }
          step={1}
          min={4}
          max={48}
          aria-labelledby={sizeSlider}
          size="small"
          valueLabelDisplay="auto"
        />
        <LabeledSlider
          label="Filter Level"
          tooltip='Limits the amount of danmaku shown on screen. "0" means show all danmaku, each level reduces the amount of danmaku shown by 20%.'
          value={localConfig.filterLevel}
          onChange={(e, newValue) =>
            handleLocalUpdate((draft) => {
              draft.filterLevel = newValue as number
            })
          }
          step={1}
          min={0}
          max={5}
          marks={filterMarks}
          aria-labelledby={filterSlider}
          size="small"
          valueLabelDisplay="auto"
        />
        <LabeledSlider
          label="Speed"
          tooltip='How fast danmaku flies across the screen. "1" being the slowest, "5" being the fastest.'
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
          aria-labelledby={filterSlider}
          size="small"
          valueLabelDisplay="auto"
        />
      </Stack>

      <Stack spacing={1} mt={2}>
        <Typography fontSize={20} color="text.secondary">
          Safe Zones
        </Typography>
        <LabeledSlider
          label="Top"
          tooltip="The percentage of the top of the screen that is safe from danmaku"
          value={localConfig.safeZones.top}
          onChange={(e, newValue) =>
            handleLocalUpdate((draft) => {
              draft.safeZones.top = newValue as number
            })
          }
          step={1}
          min={0}
          max={50}
          size="small"
          valueLabelDisplay="auto"
          marks={safeZoneMarks}
          valueLabelFormat={safeZoneValueLabelFormat}
        />
        <LabeledSlider
          label="Bottom"
          tooltip="The percentage of the bottom of the screen that is safe from danmaku"
          value={localConfig.safeZones.bottom}
          onChange={(e, newValue) =>
            handleLocalUpdate((draft) => {
              draft.safeZones.bottom = newValue as number
            })
          }
          step={1}
          min={0}
          max={50}
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
        Apply
      </LoadingButton>
    </>
  )
}

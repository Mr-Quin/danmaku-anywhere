import type { DanmakuOptions } from '@danmaku-anywhere/danmaku-engine'
import { LoadingButton } from '@mui/lab'
import type { SliderProps, TypographyProps } from '@mui/material'
import {
  Slider,
  Switch,
  Box,
  FormControlLabel,
  FormGroup,
  Typography,
} from '@mui/material'
import { useEffect, useId, useState } from 'react'

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
  typographyProps?: TypographyProps
}

const LabeledSlider = ({
  label,
  typographyProps = {},
  ...rest
}: LabeledSliderProps) => {
  const id = useId()
  return (
    <>
      <Typography id={id} {...typographyProps}>
        {label}
      </Typography>
      <Slider aria-labelledby={id} {...rest} />
    </>
  )
}

export const DanmakuOptionsController = () => {
  const { data: config, partialUpdate, isLoading } = useDanmakuOptions()

  const [localConfig, setLocalConfig] = useState<DanmakuOptions | undefined>(
    config
  )

  const opacitySlider = useId()
  const sizeSlider = useId()
  const filterSlider = useId()

  useEffect(() => {
    setLocalConfig(config)
  }, [config])

  const handleUpdate = async (newConfig: DanmakuOptions) => {
    // flush config to storage
    partialUpdate(newConfig)
  }

  const handleLocalUpdate = (newConfig: DanmakuOptions) => {
    setLocalConfig(newConfig)
  }

  if (!localConfig) {
    return null
  }

  return (
    <Box>
      <FormControlLabel
        control={
          <Switch
            checked={localConfig.show}
            onChange={(e) =>
              handleLocalUpdate({ ...localConfig, show: e.target.checked })
            }
          />
        }
        label="Show Danmaku"
      />
      <FormGroup>
        <LabeledSlider
          label="Opacity"
          value={localConfig.style.opacity}
          onChange={(e, newValue) =>
            handleLocalUpdate({
              ...localConfig,
              style: {
                ...localConfig.style,
                opacity: newValue as number,
              },
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
          value={localConfig.style.fontSize}
          onChange={(e, newValue) =>
            handleLocalUpdate({
              ...localConfig,
              style: { ...localConfig.style, fontSize: newValue as number },
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
          value={localConfig.filterLevel}
          onChange={(e, newValue) =>
            handleLocalUpdate({
              ...localConfig,
              filterLevel: newValue as number,
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
          value={convertActualSpeedToDisplay(localConfig.speed)}
          onChange={(e, newValue) => {
            handleLocalUpdate({
              ...localConfig,
              speed: convertDisplaySpeedToActual(newValue as number),
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
        <LoadingButton
          variant="contained"
          onClick={() => handleUpdate(localConfig)}
          disabled={localConfig === config}
          loading={isLoading}
        >
          Apply
        </LoadingButton>
      </FormGroup>
    </Box>
  )
}

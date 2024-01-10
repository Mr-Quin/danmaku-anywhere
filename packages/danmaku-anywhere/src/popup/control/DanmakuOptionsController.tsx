import {
  Slider,
  Switch,
  Button,
  Box,
  FormControlLabel,
  FormGroup,
  Typography,
  SliderProps,
  TypographyProps,
} from '@mui/material'
import { useEffect, useId, useState } from 'react'
import type { DanmakuOptions } from '@danmaku-anywhere/danmaku-engine'
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
  const { data: config, update, isLoading } = useDanmakuOptions()

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
    await update.mutateAsync(newConfig)
    // Handle any post-update logic here, like showing a notification
  }

  const handleLocalUpdate = (newConfig: DanmakuOptions) => {
    setLocalConfig(newConfig)
    // Handle any local update logic here, like showing a preview
  }

  if (!localConfig) {
    return null
  }

  return (
    <Box sx={{ m: 2 }}>
      <Typography variant="h6" gutterBottom>
        Danmaku Options
      </Typography>
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
        <div>
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
        </div>
        <div>
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
        </div>
        <LabeledSlider
          label="Speed"
          value={localConfig.speed}
          onChange={(e, newValue) =>
            handleLocalUpdate({
              ...localConfig,
              speed: newValue as number,
            })
          }
          step={1}
          min={0}
          max={100}
          marks
          aria-labelledby={filterSlider}
          size="small"
          valueLabelDisplay="auto"
        />
        <Button
          variant="contained"
          onClick={() => handleUpdate(localConfig)}
          disabled={isLoading || localConfig === config}
        >
          Apply
        </Button>
      </FormGroup>
    </Box>
  )
}

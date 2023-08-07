import {
  Box,
  FormControlLabel,
  Slider,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { ChangeEvent, useState } from 'react'

export const ConfigControl = () => {
  const [show, setShow] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [style, setStyle] = useState({
    opacity: 1,
    fontSize: 25,
    fontFamily: 'sans-serif',
  })

  const handleStyleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setStyle((prevStyle) => ({ ...prevStyle, [name]: value }))
  }

  return (
    <Box p={1}>
      <FormControlLabel
        control={
          <Switch
            checked={show}
            onChange={(e) => setShow(e.target.checked)}
            name="show"
            color="primary"
          />
        }
        label="Show"
      />

      <Typography gutterBottom>Speed</Typography>
      <Slider
        value={speed}
        onChange={(e, newValue) => setSpeed(newValue as number)}
        step={0.1}
        min={0}
        max={2}
        valueLabelDisplay="auto"
      />

      <Typography gutterBottom>Opacity</Typography>
      <Slider
        value={style.opacity}
        onChange={(e, newValue) =>
          setStyle((prevStyle) => ({
            ...prevStyle,
            opacity: newValue as number,
          }))
        }
        step={0.1}
        min={0}
        max={1}
        valueLabelDisplay="auto"
      />

      <Typography gutterBottom>Font Size</Typography>
      <Slider
        name="fontSize"
        value={style.fontSize}
        onChange={(e, newValue) =>
          setStyle((prevStyle) => ({
            ...prevStyle,
            fontSize: newValue as number,
          }))
        }
        step={1}
        min={10}
        max={50}
        valueLabelDisplay="auto"
      />

      <Typography gutterBottom>Font Family</Typography>
      <TextField
        value={style.fontFamily}
        onChange={(e) =>
          setStyle((prevStyle) => ({
            ...prevStyle,
            fontFamily: e.target.value,
          }))
        }
        fullWidth
        variant="outlined"
      />
    </Box>
  )
}

export default ConfigControl

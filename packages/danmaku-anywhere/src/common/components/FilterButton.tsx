import { Close, Search } from '@mui/icons-material'
import {
  Badge,
  Box,
  IconButton,
  InputAdornment,
  Popover,
  TextField,
} from '@mui/material'
import type { ChangeEvent } from 'react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface FilterButtonProps {
  filter: string
  onFilter?: (filter: string) => void
  onChange?: (filter: string) => void
}

export const FilterButton = ({
  filter,
  onFilter,
  onChange,
}: FilterButtonProps) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const anchorRef = useRef<HTMLButtonElement>(null)

  const handleOpen = () => {
    setOpen(true)
  }

  const handleClear = () => {
    onChange?.('')
    setOpen(false)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value)
  }

  return (
    <>
      <IconButton ref={anchorRef} onClick={handleOpen} color="primary">
        <Badge variant="dot" color="secondary" invisible={!filter}>
          <Search />
        </Badge>
      </IconButton>
      <Popover
        anchorEl={anchorRef.current}
        onClose={() => setOpen(false)}
        open={open}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault()
            onFilter?.(filter)
          }}
          sx={{
            background: 'background.paper',
          }}
        >
          <TextField
            label={t('common.search')}
            variant="filled"
            size="small"
            value={filter}
            onChange={handleChange}
            autoFocus
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleClear} edge="end">
                    <Close />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Popover>
    </>
  )
}

import { withStopPropagation } from '@/common/utils/withStopPropagation'
import { Close, Search } from '@mui/icons-material'
import {
  Badge,
  Box,
  IconButton,
  InputAdornment,
  Popover,
  TextField,
} from '@mui/material'
import { type ChangeEvent, useEffect } from 'react'
import { useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useTranslation } from 'react-i18next'

interface FilterButtonProps {
  filter: string
  onFilter?: (filter: string) => void
  onChange?: (filter: string) => void
  open?: boolean
  onOpen?: () => void
  onClose?: () => void
}

export const FilterButton = ({
  filter,
  onFilter,
  onChange,
  onOpen,
  onClose,
  open: openProp = false,
}: FilterButtonProps) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(openProp)

  useEffect(() => {
    setOpen(openProp)
  }, [openProp])

  const anchorRef = useRef<HTMLButtonElement>(null)

  const handleOpen = () => {
    setOpen(true)
    onOpen?.()
  }

  const handleClose = () => {
    setOpen(false)
    onClose?.()
  }

  useHotkeys('esc', handleClose)

  const handleClear = () => {
    onChange?.('')
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
        onClose={handleClose}
        open={open}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        sx={{ zIndex: 1403 }}
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
            ref={(node) => {
              if (node) {
                setTimeout(() => {
                  // somehow autoFocus doesn't work, so we manually focus the input
                  node.querySelector('input')?.focus()
                }, 0)
              }
            }}
            variant="filled"
            size="small"
            value={filter}
            onChange={handleChange}
            autoFocus
            slotProps={{
              input: {
                ...withStopPropagation(),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleClear} edge="end">
                      <Close />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
      </Popover>
    </>
  )
}

import { Close, Search } from '@mui/icons-material'
import {
  Box,
  TextField,
  IconButton,
  InputAdornment,
  Popover,
} from '@mui/material'
import type { ChangeEvent } from 'react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useStore } from '@/popup/store'

export const AnimeFilter = () => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const anchorRef = useRef<HTMLButtonElement>(null)

  const setFilter = useStore.use.danmaku().setAnimeFilter
  const filter = useStore.use.danmaku().animeFilter

  const handleOpen = () => {
    setOpen(true)
  }

  const handleClear = () => {
    setFilter('')
    setOpen(false)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value)
  }

  return (
    <>
      <IconButton ref={anchorRef} onClick={handleOpen} color="primary">
        <Search />
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
            setFilter(filter.trim())
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

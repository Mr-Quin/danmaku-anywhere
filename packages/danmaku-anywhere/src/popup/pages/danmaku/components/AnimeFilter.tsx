import { Close, Search } from '@mui/icons-material'
import { Box, TextField, IconButton, InputAdornment } from '@mui/material'
import { useRef, useState } from 'react'

import { useStore } from '@/popup/store'

export const AnimeFilter = () => {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')

  const anchorRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSearch = useStore.use.danmaku().setAnimeFilter

  const handleOpen = () => {
    setOpen(true)
    inputRef.current?.focus()
  }

  const handleClear = () => {
    setFilter('')
    handleSearch('')
    setOpen(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value.trim())
    handleSearch(e.target.value.trim())
  }

  const handleBlur = () => {
    if (filter === '') {
      setOpen(false)
    }
  }

  return (
    <>
      {!open && (
        <IconButton ref={anchorRef} onClick={handleOpen} color="primary">
          <Search />
        </IconButton>
      )}

      {open && (
        <Box
          px={1}
          flexShrink={1}
          component="form"
          onSubmit={(e) => {
            e.preventDefault()
            handleSearch(filter)
          }}
        >
          <TextField
            ref={inputRef}
            label="Search"
            variant="outlined"
            size="small"
            type="text"
            value={filter}
            onChange={handleChange}
            onBlur={handleBlur}
            autoFocus
            margin="none"
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
      )}
    </>
  )
}

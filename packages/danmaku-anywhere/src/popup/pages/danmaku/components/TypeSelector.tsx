import { FilterList } from '@mui/icons-material'
import {
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  IconButton,
  Popover,
} from '@mui/material'
import type { ChangeEvent } from 'react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DanmakuSourceType } from '@/common/danmaku/types/enums'
import { useStore } from '@/popup/store'

export const TypeSelector = () => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const anchorRef = useRef<HTMLButtonElement>(null)

  const { selectedTypes, setSelectedType } = useStore.use.danmaku()

  const handleOpen = () => {
    setOpen(true)
  }

  const handleSelect =
    (type: DanmakuSourceType) => (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        if (!selectedTypes.includes(type)) {
          setSelectedType([...selectedTypes, type])
        }
      } else {
        setSelectedType(selectedTypes.filter((item) => item !== type))
      }
    }

  return (
    <>
      <IconButton ref={anchorRef} onClick={handleOpen} color="primary">
        <FilterList />
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
          }}
          px={2}
          sx={{
            background: 'background.paper',
          }}
        >
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox onChange={handleSelect(DanmakuSourceType.DDP)} />
              }
              label={t(
                `danmaku.type.${DanmakuSourceType[DanmakuSourceType.DDP]}`
              )}
              checked={selectedTypes.includes(DanmakuSourceType.DDP)}
            />
            <FormControlLabel
              control={
                <Checkbox onChange={handleSelect(DanmakuSourceType.Custom)} />
              }
              label={t(
                `danmaku.type.${DanmakuSourceType[DanmakuSourceType.Custom]}`
              )}
              checked={selectedTypes.includes(DanmakuSourceType.Custom)}
            />
          </FormGroup>
        </Box>
      </Popover>
    </>
  )
}

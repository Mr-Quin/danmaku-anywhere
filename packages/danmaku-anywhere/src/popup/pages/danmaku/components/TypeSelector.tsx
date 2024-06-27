import { FilterList } from '@mui/icons-material'
import {
  Box,
  IconButton,
  Popover,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DanmakuType, danmakuTypeList } from '@/common/types/danmaku/Danmaku'
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
    (type: DanmakuType) => (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        if (!selectedTypes.includes(type)) {
          setSelectedType([...selectedTypes, type])
        }
      } else {
        setSelectedType(selectedTypes.filter((item) => item !== type))
      }
    }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedType(danmakuTypeList)
    } else {
      setSelectedType([])
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
                <Checkbox
                  defaultChecked
                  onChange={handleSelect(DanmakuType.DDP)}
                />
              }
              label={t(`danmaku.type.${DanmakuType[DanmakuType.DDP]}`)}
              checked={selectedTypes.includes(DanmakuType.DDP)}
            />
            <FormControlLabel
              control={
                <Checkbox
                  defaultChecked
                  onChange={handleSelect(DanmakuType.Custom)}
                />
              }
              label={t(`danmaku.type.${DanmakuType[DanmakuType.Custom]}`)}
              checked={selectedTypes.includes(DanmakuType.Custom)}
            />
          </FormGroup>
        </Box>
      </Popover>
    </>
  )
}

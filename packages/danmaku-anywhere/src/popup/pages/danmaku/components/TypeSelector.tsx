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
                  onChange={handleSelectAll}
                  indeterminate={
                    selectedTypes.length > 0 &&
                    selectedTypes.length < danmakuTypeList.length
                  }
                />
              }
              label={t(`danmaku.type.all`)}
              checked={selectedTypes.length === danmakuTypeList.length}
            />
            <FormControlLabel
              control={
                <Checkbox
                  defaultChecked
                  onChange={handleSelect(DanmakuType.DDP)}
                />
              }
              label={t(`danmaku.type.${DanmakuType[DanmakuType.DDP]}`)}
              checked={selectedTypes.includes(DanmakuType.DDP)}
              sx={{
                ml: 1,
              }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  defaultChecked
                  onChange={handleSelect(DanmakuType.Manual)}
                />
              }
              label={t(`danmaku.type.${DanmakuType[DanmakuType.Manual]}`)}
              checked={selectedTypes.includes(DanmakuType.Manual)}
              sx={{
                ml: 1,
              }}
            />
          </FormGroup>
        </Box>
      </Popover>
    </>
  )
}

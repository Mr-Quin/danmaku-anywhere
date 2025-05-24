import { FilterList } from '@mui/icons-material'
import {
  Badge,
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

import type { DanmakuSourceType } from '@/common/danmaku/enums'
import {
  danmakuSourceTypeList,
  localizedDanmakuSourceType,
} from '@/common/danmaku/enums'

type TypeSelectorProps = {
  selectedTypes: DanmakuSourceType[]
  setSelectedType: (types: DanmakuSourceType[]) => void
}

export const TypeSelector = ({
  selectedTypes,
  setSelectedType,
}: TypeSelectorProps) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const anchorRef = useRef<HTMLButtonElement>(null)

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
        <Badge
          variant="dot"
          color="secondary"
          invisible={selectedTypes.length === danmakuSourceTypeList.length}
        >
          <FilterList />
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
        sx={{ zIndex: 1403 }}
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
            {danmakuSourceTypeList.map((type) => {
              return (
                <FormControlLabel
                  key={type}
                  control={
                    <Checkbox
                      onChange={handleSelect(type)}
                      checked={selectedTypes.includes(type)}
                      disabled={
                        // Prevent unselecting the last type
                        selectedTypes.length === 1 && selectedTypes[0] === type
                      }
                    />
                  }
                  label={t(localizedDanmakuSourceType(type))}
                />
              )
            })}
          </FormGroup>
        </Box>
      </Popover>
    </>
  )
}

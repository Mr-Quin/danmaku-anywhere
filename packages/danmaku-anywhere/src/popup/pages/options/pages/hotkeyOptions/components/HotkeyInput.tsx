import { Clear } from '@mui/icons-material'
import { Button, IconButton, TextField } from '@mui/material'
import type { KeyboardEvent } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getKeySymbolMap } from '@/common/options/extensionOptions/hotkeys'
import { getOS, properCase } from '@/common/utils/utils'

interface HotkeyInputProps {
  onKeyChange?: (key: string) => void
  value?: string
}

export const HotkeyInput = ({ onKeyChange, value }: HotkeyInputProps) => {
  const { t } = useTranslation()
  const [key, setKey] = useState(value ?? '')
  const [editing, setEditing] = useState(false)

  const handleKeyChange = (key: string) => {
    onKeyChange?.(key)
    setKey(key)
    setEditing(false)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const modifiers: string[] = []
    const key = e.key.toLowerCase()

    // check if the key is a modifier key, modifier keys can't be used alone
    if (['control', 'shift', 'alt', 'meta'].includes(key)) {
      return
    }

    if (e.ctrlKey) {
      modifiers.push('ctrl')
    }
    if (e.shiftKey) {
      modifiers.push('shift')
    }
    if (e.altKey) {
      modifiers.push('alt')
    }
    if (e.metaKey) {
      modifiers.push('meta')
    }

    if (modifiers.length) {
      const keyStr = `${modifiers.join('+')}+${key}`
      handleKeyChange(keyStr)
    } else {
      handleKeyChange(key)
    }
  }

  const isMacOs = getOS() === 'MacOS'
  const symbolMap = getKeySymbolMap({ isMacOs })

  const displayKey = key
    .split('+')
    .map((key) => {
      if (key in symbolMap) return symbolMap[key]
      return properCase(key)
    })
    .join('+')

  if (!editing && !key) {
    return (
      <Button
        onClick={() => {
          setEditing(true)
        }}
        variant="outlined"
        color="inherit"
      >
        {t('optionsPage.hotkeys.addHotkey', 'Add Hotkey')}
      </Button>
    )
  }

  return (
    <TextField
      value={displayKey}
      onKeyDown={handleKeyDown}
      placeholder={t('optionsPage.hotkeys.enterKey', 'Enter key')}
      autoComplete="off"
      size="small"
      slotProps={{
        input: {
          endAdornment: [
            <IconButton
              key="clear"
              onClick={() => {
                handleKeyChange('')
              }}
            >
              <Clear />
            </IconButton>,
          ],
        },
      }}
    />
  )
}

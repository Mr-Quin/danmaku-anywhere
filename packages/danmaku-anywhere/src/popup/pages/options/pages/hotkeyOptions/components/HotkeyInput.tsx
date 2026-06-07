import { Add, Clear } from '@mui/icons-material'
import { Box, Button, IconButton, TextField } from '@mui/material'
import type { KeyboardEvent } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { formatHotkeyCombo } from '@/common/options/extensionOptions/hotkeys'
import { getOS } from '@/common/utils/utils'

interface HotkeyInputProps {
  onKeyChange?: (key: string) => void
  value?: string
}

const Kbd = ({ children }: { children: string }) => {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 24,
        height: 26,
        px: 1,
        borderRadius: 1,
        bgcolor: 'background.paper',
        border: 1,
        borderBottomWidth: 2,
        borderColor: 'divider',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {children}
    </Box>
  )
}

export const HotkeyInput = ({ onKeyChange, value }: HotkeyInputProps) => {
  const { t } = useTranslation()
  const [key, setKey] = useState(value ?? '')
  const [editing, setEditing] = useState(false)

  const isMacOs = getOS() === 'MacOS'

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

  if (editing) {
    return (
      <TextField
        value={formatHotkeyCombo(key, { isMacOs })}
        onKeyDown={handleKeyDown}
        onBlur={() => setEditing(false)}
        placeholder={t('optionsPage.hotkeys.enterKey', 'Enter key')}
        autoComplete="off"
        autoFocus
        size="small"
        fullWidth={false}
        sx={{
          width: 180,
          '& .MuiInputBase-root': { height: 28 },
          '& .MuiInputBase-input': { py: 0 },
        }}
      />
    )
  }

  if (!key) {
    return (
      <Button
        onClick={() => setEditing(true)}
        variant="soft"
        startIcon={<Add />}
      >
        {t('optionsPage.hotkeys.addHotkey', 'Add Hotkey')}
      </Button>
    )
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      <Box
        component="button"
        type="button"
        onClick={() => setEditing(true)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          border: 'none',
          background: 'none',
          p: 0,
          cursor: 'pointer',
        }}
      >
        {key.split('+').map((part, i) => (
          <Kbd key={`${part}-${i}`}>{formatHotkeyCombo(part, { isMacOs })}</Kbd>
        ))}
      </Box>
      <IconButton size="small" onClick={() => handleKeyChange('')}>
        <Clear fontSize="small" />
      </IconButton>
    </Box>
  )
}

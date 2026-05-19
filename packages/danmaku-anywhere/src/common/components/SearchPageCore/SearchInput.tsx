import { Close, Search } from '@mui/icons-material'
import {
  Autocomplete,
  alpha,
  Box,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material'
import { type RefObject, type SyntheticEvent, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { getScrollBarProps } from '@/common/components/layout/ScrollBox'
import { useSearchHistory } from '@/common/options/searchHistory/useSearchHistory'
import { matchWithPinyin } from '@/common/utils/utils'
import { withStopPropagation } from '@/common/utils/withStopPropagation'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  inputRef?: RefObject<HTMLInputElement | null>
}

const HOTKEY_LABEL = navigator.platform.toLowerCase().includes('mac')
  ? '⌘K'
  : 'Ctrl K'

export function SearchInput({
  value,
  onChange,
  onSubmit,
  inputRef,
}: SearchInputProps) {
  const { t } = useTranslation()
  const { entries, removeEntry } = useSearchHistory()

  const localInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        const target = inputRef?.current ?? localInputRef.current
        target?.focus()
        target?.select()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [inputRef])

  const handleAutocompleteChange = (
    event: SyntheticEvent,
    next: string | null
  ) => {
    if (next === null) {
      return
    }
    onChange(next)
    if (event.type === 'click') {
      onSubmit(next)
    }
  }

  return (
    <Autocomplete
      freeSolo
      openOnFocus
      options={entries}
      inputValue={value}
      onInputChange={(_event, next, reason) => {
        if (reason !== 'reset') {
          onChange(next)
        }
      }}
      onChange={handleAutocompleteChange}
      filterOptions={(options, state) => {
        if (!state.inputValue) {
          return options
        }
        return options.filter((option) => {
          return matchWithPinyin(option, state.inputValue)
        })
      }}
      renderOption={(props, option) => {
        return (
          <li
            {...props}
            key={option}
            style={{ ...props.style, paddingBlock: 2, minHeight: 'auto' }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                justifyContent: 'space-between',
              }}
            >
              <Box
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  fontSize: 13,
                }}
              >
                {option}
              </Box>
              <IconButton
                size="small"
                edge="end"
                aria-label={t('common.delete')}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  removeEntry.mutate(option)
                }}
                sx={{ ml: 1, opacity: 0.5, '&:hover': { opacity: 1 } }}
              >
                <Close fontSize="small" />
              </IconButton>
            </Box>
          </li>
        )
      }}
      size="small"
      fullWidth
      slotProps={{
        popper: { sx: { zIndex: 1403 } },
        listbox: {
          sx: (theme) => ({
            py: 0.5,
            maxHeight: 220,
            ...getScrollBarProps(theme),
          }),
        },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={t(
            'searchPage.searchPlaceholder',
            'Search title or paste a video URL…'
          )}
          required
          autoFocus
          inputRef={(el: HTMLInputElement | null) => {
            localInputRef.current = el
            if (inputRef) {
              inputRef.current = el
            }
          }}
          autoComplete="off"
          slotProps={{
            htmlInput: {
              ...params.inputProps,
              'data-testid': 'search-input',
            },
            input: {
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start" sx={{ mr: 0.5 }}>
                  <Search sx={{ fontSize: 16, color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: !value ? (
                <InputAdornment position="end">
                  <Typography
                    component="span"
                    sx={(theme) => ({
                      display: 'inline-flex',
                      alignItems: 'center',
                      px: 0.75,
                      py: 0.125,
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                      border: `1px solid ${theme.palette.divider}`,
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, monospace',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'text.secondary',
                      letterSpacing: 0.4,
                      lineHeight: 1.4,
                    })}
                  >
                    {HOTKEY_LABEL}
                  </Typography>
                </InputAdornment>
              ) : (
                params.InputProps.endAdornment
              ),
            },
          }}
          sx={(theme) => ({
            '& .MuiOutlinedInput-root': {
              paddingInline: 1,
              transition: 'box-shadow 120ms ease, border-color 120ms ease',
              '&.Mui-focused': {
                boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.18)}`,
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.primary.main,
                borderWidth: 1,
              },
            },
          })}
          {...withStopPropagation({
            whitelistKeys: ['Escape', 'Enter', 'ArrowUp', 'ArrowDown'],
          })}
        />
      )}
    />
  )
}

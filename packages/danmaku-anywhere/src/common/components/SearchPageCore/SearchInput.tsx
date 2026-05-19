import { Close, Link, Search } from '@mui/icons-material'
import {
  Autocomplete,
  alpha,
  Box,
  Button,
  Chip,
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
import { getUrlProviderLabel } from './UrlParseSection'

declare module '@mui/material/Autocomplete' {
  interface AutocompletePaperSlotPropsOverrides {
    onClearHistory?: () => void
    hasEntries?: boolean
  }
}

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  inputRef?: RefObject<HTMLInputElement | null>
  urlMode?: boolean
}

const HOTKEY_LABEL = navigator.platform.toLowerCase().includes('mac')
  ? '⌘K'
  : 'Ctrl K'

export function SearchInput({
  value,
  onChange,
  onSubmit,
  inputRef,
  urlMode,
}: SearchInputProps) {
  const { t } = useTranslation()
  const { entries, removeEntry, clearHistory } = useSearchHistory()

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

  const providerLabel = urlMode ? getUrlProviderLabel(value) : undefined

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
      slots={{
        paper: HistoryDropdownPaper,
      }}
      slotProps={{
        popper: { sx: { zIndex: 1403 } },
        listbox: {
          sx: (theme) => ({
            py: 0.5,
            maxHeight: 220,
            ...getScrollBarProps(theme),
          }),
        },
        paper: {
          hasEntries: entries.length > 0,
          onClearHistory: () => clearHistory.mutate(),
        },
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
                gap: 1,
              }}
            >
              <Box
                sx={(theme) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  flex: 1,
                  minWidth: 0,
                  color: theme.palette.text.primary,
                })}
              >
                <Box
                  component="span"
                  sx={(theme) => ({
                    display: 'inline-flex',
                    color: theme.palette.text.secondary,
                    transform: 'scaleX(-1)',
                  })}
                  aria-hidden
                >
                  <Search sx={{ fontSize: 12 }} />
                </Box>
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
                sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
              >
                <Close fontSize="small" />
              </IconButton>
            </Box>
          </li>
        )
      }}
      size="small"
      fullWidth
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
              style: urlMode
                ? {
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: 12,
                  }
                : undefined,
            },
            input: {
              ...params.InputProps,
              startAdornment: urlMode ? (
                <InputAdornment position="start" sx={{ mr: 0.5 }}>
                  {providerLabel ? (
                    <Chip
                      label={t(providerLabel)}
                      color="secondary"
                      size="small"
                      sx={{ height: 18, fontSize: 10 }}
                    />
                  ) : (
                    <Link sx={{ fontSize: 14, color: 'text.secondary' }} />
                  )}
                </InputAdornment>
              ) : (
                <InputAdornment position="start" sx={{ mr: 0.5 }}>
                  <Search sx={{ fontSize: 16, color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment:
                !value && !urlMode ? (
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
              ...(urlMode && {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: theme.palette.primary.main,
                },
                boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.18)}`,
              }),
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

interface HistoryDropdownPaperProps
  extends React.HTMLAttributes<HTMLDivElement> {
  onClearHistory?: () => void
  hasEntries?: boolean
}

function HistoryDropdownPaper({
  onClearHistory,
  hasEntries,
  children,
  ...rest
}: HistoryDropdownPaperProps) {
  const { t } = useTranslation()

  return (
    <Box
      {...rest}
      sx={(theme) => ({
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        boxShadow: '0 12px 32px -16px rgba(10,5,20,.25)',
        overflow: 'hidden',
        marginTop: 0.5,
      })}
    >
      {hasEntries && (
        <Box
          sx={(theme) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.25,
            py: 0.75,
            color: theme.palette.text.secondary,
          })}
        >
          <Typography
            variant="overline"
            sx={{ flex: 1, color: 'text.secondary' }}
          >
            {t('searchPage.history.recent', 'Recent')}
          </Typography>
          <Button
            size="small"
            variant="text"
            color="inherit"
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onClearHistory?.()
            }}
            sx={{
              minWidth: 0,
              minHeight: 0,
              padding: 0,
              fontSize: 11,
              textTransform: 'none',
              letterSpacing: 0,
            }}
          >
            {t('searchPage.history.clear', 'Clear')}
          </Button>
        </Box>
      )}
      {children}
    </Box>
  )
}

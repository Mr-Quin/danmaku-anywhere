import { Close, History, Link, Search } from '@mui/icons-material'
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
import {
  forwardRef,
  type SyntheticEvent,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import { useTranslation } from 'react-i18next'
import { getScrollBarProps } from '@/common/components/layout/ScrollBox'
import { formatHotkeyCombo } from '@/common/options/extensionOptions/hotkeys'
import { useHotkeyOptions } from '@/common/options/extensionOptions/useHotkeyOptions'
import { useSearchHistory } from '@/common/options/searchHistory/useSearchHistory'
import { MONOSPACE_FONT_FAMILY } from '@/common/theme/sakura'
import { getOS, matchWithPinyin } from '@/common/utils/utils'
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
  urlMode?: boolean
  focusToken?: number
}

export function SearchInput({
  value,
  onChange,
  onSubmit,
  urlMode,
  focusToken,
}: SearchInputProps) {
  const showHotkey = focusToken !== undefined
  const isMacOs = getOS() === 'MacOS'
  const { getKeyCombo } = useHotkeyOptions()
  const hotkeyLabel = showHotkey
    ? formatHotkeyCombo(getKeyCombo('openSearchPanel'), {
        isMacOs,
        separator: isMacOs ? '' : ' ',
      })
    : ''
  const { t } = useTranslation()
  const { entries, removeEntry, clearHistory } = useSearchHistory()

  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (focusToken === undefined || focusToken === 0) {
      return
    }
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [focusToken])

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
  const historyEnabled = !urlMode

  const filteredEntries = useMemo(() => {
    if (!historyEnabled) {
      return []
    }
    if (!value) {
      return entries
    }
    return entries.filter((entry) => matchWithPinyin(entry, value))
  }, [historyEnabled, entries, value])

  return (
    <Autocomplete
      freeSolo
      openOnFocus={historyEnabled}
      options={filteredEntries}
      filterOptions={(options) => options}
      inputValue={value}
      onInputChange={(_event, next, reason) => {
        if (reason !== 'reset') {
          onChange(next)
        }
      }}
      onChange={handleAutocompleteChange}
      slots={{
        paper: HistoryDropdownPaper,
      }}
      slotProps={{
        popper: {
          sx: {
            zIndex: 1403,
            display: filteredEntries.length === 0 ? 'none' : undefined,
          },
        },
        listbox: {
          sx: (theme) => ({
            padding: 0,
            maxHeight: 220,
            ...getScrollBarProps(theme),
          }),
        },
        paper: {
          hasEntries: filteredEntries.length > 0,
          onClearHistory: () => clearHistory.mutate(),
        },
      }}
      renderOption={(props, option) => {
        return (
          <li
            {...props}
            key={option}
            style={{
              ...props.style,
              paddingBlock: 6,
              paddingInline: 10,
              minHeight: 'auto',
            }}
          >
            <Box
              sx={(theme) => ({
                display: 'inline-flex',
                color: theme.palette.text.secondary,
                width: 18,
                flexShrink: 0,
                justifyContent: 'flex-start',
              })}
              aria-hidden
            >
              <History sx={{ fontSize: 14 }} />
            </Box>
            <Box
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                minWidth: 0,
                fontSize: 13,
              }}
            >
              {option}
            </Box>
            <IconButton
              size="small"
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
              sx={{
                ml: 0.5,
                mr: -0.5,
                p: 0.25,
                opacity: 0.5,
                '&:hover': { opacity: 1 },
              }}
            >
              <Close sx={{ fontSize: 14 }} />
            </IconButton>
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
          inputRef={inputRef}
          autoComplete="off"
          slotProps={{
            ...params.slotProps,

            htmlInput: {
              ...params.slotProps.htmlInput,
              'data-testid': 'search-input',
              style: urlMode
                ? {
                    fontFamily: MONOSPACE_FONT_FAMILY,
                    fontSize: 12,
                  }
                : undefined,
            },

            input: {
              ...params.slotProps.input,
              startAdornment: urlMode ? (
                <InputAdornment position="start" sx={{ mr: 0.5 }}>
                  {providerLabel ? (
                    <Chip
                      label={providerLabel}
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
                showHotkey && !value && !urlMode && hotkeyLabel ? (
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
                        fontFamily: MONOSPACE_FONT_FAMILY,
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'text.secondary',
                        letterSpacing: 0.4,
                        lineHeight: 1.4,
                      })}
                    >
                      {hotkeyLabel}
                    </Typography>
                  </InputAdornment>
                ) : (
                  params.slotProps.input.endAdornment
                ),
            },
          }}
          sx={(theme) => ({
            '& .MuiOutlinedInput-root': {
              paddingInline: 1,
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

const HistoryDropdownPaper = forwardRef<
  HTMLDivElement,
  HistoryDropdownPaperProps
>(function HistoryDropdownPaper(
  { onClearHistory, hasEntries, children, ...rest },
  ref
) {
  const { t } = useTranslation()

  return (
    <Box
      ref={ref}
      {...rest}
      sx={(theme) => ({
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
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
            pl: '10px',
            pr: '10px',
            py: 0.5,
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
})

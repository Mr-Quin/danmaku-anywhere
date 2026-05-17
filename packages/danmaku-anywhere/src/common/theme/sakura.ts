import {
  alpha,
  createTheme,
  type PaletteOptions,
  type Theme,
  type ThemeOptions,
} from '@mui/material/styles'
import type * as React from 'react'

// Self-host display + body fonts. MV3 CSP blocks Google Fonts CDN.
// The browser only fetches woff2 when the families resolve.
import '@fontsource/fraunces/latin-600.css'
import '@fontsource/fraunces/latin-700.css'
import '@fontsource/plus-jakarta-sans/latin-400.css'
import '@fontsource/plus-jakarta-sans/latin-500.css'
import '@fontsource/plus-jakarta-sans/latin-600.css'
import '@fontsource/plus-jakarta-sans/latin-700.css'
import '@fontsource/noto-sans-sc/chinese-simplified-400.css'
import '@fontsource/noto-sans-sc/chinese-simplified-500.css'
import '@fontsource/noto-sans-sc/chinese-simplified-700.css'

type SeverityKey = 'success' | 'warning' | 'info' | 'error'

declare module '@mui/material/styles' {
  interface Palette {
    paperAlt: string
    primaryInk: string
    secondaryInk: string
    severityInk: Record<SeverityKey, string>
    actionActive: string
  }
  interface PaletteOptions {
    paperAlt?: string
    primaryInk?: string
    secondaryInk?: string
    severityInk?: Record<SeverityKey, string>
    actionActive?: string
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    soft: true
  }
}

declare module '@mui/material/styles' {
  interface TypographyVariants {
    meta: React.CSSProperties
  }
  interface TypographyVariantsOptions {
    meta?: React.CSSProperties
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    meta: true
  }
}

const SAKURA_LIGHT: PaletteOptions = {
  mode: 'light',
  primary: {
    main: '#E86A8E',
    dark: '#D9567C',
    light: '#FCE5EC',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#7A6CE0',
    dark: '#6957D3',
    light: '#E7E3FC',
    contrastText: '#FFFFFF',
  },
  error: { main: '#E5536B', light: '#FBDCE2' },
  warning: { main: '#E9A23B', light: '#FBE9CC' },
  info: { main: '#5AA7E8', light: '#E0EEF9' },
  success: { main: '#2FAE78', light: '#D6F0E4' },
  background: { default: '#FFF8F5', paper: '#FFFFFF' },
  text: {
    primary: '#2A1B24',
    secondary: '#7A6A74',
    disabled: 'rgba(42,27,36,0.40)',
  },
  divider: 'rgba(42,27,36,0.09)',
  action: {
    hover: 'rgba(42,27,36,0.04)',
    selected: '#FCE5EC',
    focus: 'rgba(232,106,142,0.20)',
  },
  paperAlt: '#FBEFEA',
  primaryInk: '#B14267',
  secondaryInk: '#4A3CB8',
  severityInk: {
    success: '#1E7E58',
    warning: '#9A6A1E',
    info: '#2F6FAF',
    error: '#B23445',
  },
  actionActive: 'rgba(232,106,142,0.08)',
}

const SAKURA_DARK: PaletteOptions = {
  mode: 'dark',
  primary: {
    main: '#F48FB1',
    dark: '#F06292',
    light: 'rgba(244,143,177,0.18)',
    contrastText: '#2A0F1A',
  },
  secondary: {
    main: '#B39CF5',
    dark: '#9F86F0',
    light: 'rgba(179,156,245,0.18)',
    contrastText: '#1A1330',
  },
  error: { main: '#F0879A', light: 'rgba(240,135,154,0.18)' },
  warning: { main: '#F5C26B', light: 'rgba(245,194,107,0.16)' },
  info: { main: '#7FC0F0', light: 'rgba(127,192,240,0.16)' },
  success: { main: '#6DD7A6', light: 'rgba(109,215,166,0.16)' },
  background: { default: '#15101A', paper: '#1D1623' },
  text: {
    primary: '#F6E8EE',
    secondary: '#A89AA6',
    disabled: 'rgba(246,232,238,0.40)',
  },
  divider: 'rgba(246,232,238,0.09)',
  action: {
    hover: 'rgba(246,232,238,0.05)',
    selected: 'rgba(244,143,177,0.18)',
    focus: 'rgba(244,143,177,0.28)',
  },
  paperAlt: '#241C2C',
  primaryInk: '#F8BBD0',
  secondaryInk: '#C8B6F7',
  severityInk: {
    success: '#9CEAC4',
    warning: '#F5D699',
    info: '#A8D4F5',
    error: '#F5A6B5',
  },
  actionActive: 'rgba(244,143,177,0.10)',
}

const severityKeys: readonly SeverityKey[] = [
  'success',
  'warning',
  'info',
  'error',
] as const

const sakuraComponents: ThemeOptions['components'] = {
  // Density defaults — responsible for most of the visual tightening
  MuiButton: {
    defaultProps: { size: 'small', disableElevation: true },
    styleOverrides: {
      root: { borderRadius: 8, fontWeight: 600, paddingInline: 10 },
      sizeSmall: { minHeight: 28, paddingInline: 10 },
      sizeMedium: { minHeight: 32 },
    },
    variants: [
      {
        props: { variant: 'soft', color: 'primary' },
        style: ({ theme }) => ({
          backgroundColor: theme.palette.primary.light,
          color: theme.palette.primaryInk,
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.22),
          },
        }),
      },
      {
        props: { variant: 'soft', color: 'secondary' },
        style: ({ theme }) => ({
          backgroundColor: theme.palette.secondary.light,
          color: theme.palette.secondaryInk,
          '&:hover': {
            backgroundColor: alpha(theme.palette.secondary.main, 0.22),
          },
        }),
      },
      ...severityKeys.map((sev) => ({
        props: { variant: 'soft' as const, color: sev },
        style: ({ theme }: { theme: Theme }) => ({
          backgroundColor: theme.palette[sev].light,
          color: theme.palette.severityInk[sev],
          '&:hover': {
            backgroundColor: alpha(theme.palette[sev].main, 0.22),
          },
        }),
      })),
    ],
  },
  MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
  MuiSelect: { defaultProps: { size: 'small' } },
  MuiIconButton: {
    defaultProps: { size: 'small' },
    styleOverrides: {
      root: { borderRadius: 7 },
    },
  },
  MuiTable: { defaultProps: { size: 'small' } },
  MuiList: { defaultProps: { dense: true } },

  // Shrink icons globally so they sit comfortably next to dense body text.
  // 1.125rem = 18px at the 16px root. IconButton sizeSmall stays 1.25rem (20px).
  MuiSvgIcon: {
    styleOverrides: {
      root: { fontSize: '1.125rem' },
      fontSizeSmall: { fontSize: '1rem' },
      fontSizeLarge: { fontSize: '1.5rem' },
    },
  },

  MuiPaper: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: { backgroundImage: 'none' },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 12,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: 'none',
      }),
    },
  },

  MuiChip: {
    defaultProps: { size: 'small' },
    styleOverrides: {
      root: { fontWeight: 600, letterSpacing: 0.1 },
      sizeSmall: { height: 22, fontSize: '0.6875rem' },
      filled: ({ theme, ownerState }) => {
        const c = ownerState.color
        if (!c || c === 'default') {
          return {
            backgroundColor: theme.palette.paperAlt,
            color: theme.palette.text.primary,
          }
        }
        if (c === 'primary') {
          return {
            backgroundColor: theme.palette.primary.light,
            color: theme.palette.primaryInk,
          }
        }
        if (c === 'secondary') {
          return {
            backgroundColor: theme.palette.secondary.light,
            color: theme.palette.secondaryInk,
          }
        }
        if ((severityKeys as readonly string[]).includes(c)) {
          const sev = c as SeverityKey
          return {
            backgroundColor: theme.palette[sev].light,
            color: theme.palette.severityInk[sev],
          }
        }
        return {}
      },
      outlined: ({ theme }) => ({
        borderColor: theme.palette.divider,
        color: theme.palette.text.secondary,
        backgroundColor: 'transparent',
      }),
    },
  },

  // Chips rendered by Autocomplete + Select multiple inherit MuiChip — no
  // separate override needed.
  MuiAutocomplete: {
    styleOverrides: {
      tag: { margin: 2 },
    },
  },

  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 8,
        backgroundColor: theme.palette.paperAlt,
      }),
      input: { padding: '7px 10px' },
      notchedOutline: ({ theme }) => ({ borderColor: theme.palette.divider }),
    },
  },
  MuiInputLabel: {
    styleOverrides: { root: { fontSize: '0.8125rem' } },
  },

  MuiListItemButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 8,
        padding: '6px 8px',
        '&.Mui-selected': {
          backgroundColor: theme.palette.action.selected,
          '&:hover': { backgroundColor: theme.palette.action.selected },
        },
      }),
    },
  },
  MuiListItemText: {
    styleOverrides: {
      primary: { fontWeight: 500 },
      secondary: ({ theme }) => ({
        fontSize: '0.75rem',
        color: theme.palette.text.secondary,
      }),
    },
  },
  MuiListItemIcon: {
    styleOverrides: { root: { minWidth: 28 } },
  },

  MuiTabs: {
    styleOverrides: { indicator: { height: 2 } },
  },

  MuiTypography: {
    defaultProps: {
      variantMapping: {
        meta: 'span',
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        minHeight: 0,
        padding: '8px 10px',
        fontSize: '0.8125rem',
        fontWeight: 600,
      },
    },
  },

  // Severity-tinted alert backgrounds match the chip + soft button system.
  // Snackbar/Toast renders an Alert internally, so this re-themes toasts too.
  MuiAlert: {
    styleOverrides: {
      root: { borderRadius: 8, padding: '6px 10px', fontSize: '0.8125rem' },
      standardSuccess: ({ theme }) => ({
        backgroundColor: theme.palette.success.light,
        color: theme.palette.severityInk.success,
      }),
      standardInfo: ({ theme }) => ({
        backgroundColor: theme.palette.info.light,
        color: theme.palette.severityInk.info,
      }),
      standardWarning: ({ theme }) => ({
        backgroundColor: theme.palette.warning.light,
        color: theme.palette.severityInk.warning,
      }),
      standardError: ({ theme }) => ({
        backgroundColor: theme.palette.error.light,
        color: theme.palette.severityInk.error,
      }),
      icon: ({ ownerState, theme }) => {
        const sev = ownerState.severity
        if (!sev) {
          return {}
        }
        return { color: theme.palette.severityInk[sev] }
      },
    },
  },

  MuiSwitch: {
    defaultProps: { size: 'small' },
    styleOverrides: {
      root: { padding: 6 },
    },
  },
  MuiSlider: { defaultProps: { size: 'small' } },

  MuiDivider: {
    styleOverrides: {
      root: ({ theme }) => ({ borderColor: theme.palette.divider }),
    },
  },

  MuiAppBar: {
    defaultProps: { elevation: 0, position: 'static' },
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
      }),
    },
  },

  MuiTooltip: {
    styleOverrides: {
      tooltip: ({ theme }) => ({
        fontSize: '0.6875rem',
        backgroundColor: theme.palette.mode === 'dark' ? '#3A2E3A' : '#2A1B24',
        color: '#FFFFFF',
        borderRadius: 6,
        padding: '4px 8px',
      }),
    },
  },
}

const sakuraTypography: ThemeOptions['typography'] = {
  fontFamily: `'Plus Jakarta Sans', 'Noto Sans SC', system-ui, sans-serif`,
  h1: {
    fontFamily: `'Fraunces', 'Plus Jakarta Sans', serif`,
    fontWeight: 700,
    fontSize: '1.375rem',
    lineHeight: 1.3,
  },
  h2: {
    fontFamily: `'Fraunces', 'Plus Jakarta Sans', serif`,
    fontWeight: 700,
    fontSize: '1.125rem',
    lineHeight: 1.3,
  },
  h3: {
    fontFamily: `'Fraunces', 'Plus Jakarta Sans', serif`,
    fontWeight: 700,
    fontSize: '1rem',
    lineHeight: 1.3,
  },
  h4: {
    fontFamily: `'Fraunces', 'Plus Jakarta Sans', serif`,
    fontWeight: 700,
    fontSize: '0.9375rem',
    lineHeight: 1.3,
  },
  h5: {
    fontFamily: `'Fraunces', 'Plus Jakarta Sans', serif`,
    fontWeight: 700,
    fontSize: '0.875rem',
    lineHeight: 1.3,
  },
  h6: {
    fontFamily: `'Fraunces', 'Plus Jakarta Sans', serif`,
    fontWeight: 700,
    fontSize: '0.8125rem',
    lineHeight: 1.3,
  },
  body1: { fontSize: '0.875rem', lineHeight: 1.45 },
  body2: { fontSize: '0.8125rem', lineHeight: 1.4 },
  caption: { fontSize: '0.75rem', lineHeight: 1.35, letterSpacing: 0.1 },
  overline: {
    fontSize: '0.6875rem',
    lineHeight: 1.4,
    fontWeight: 700,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  // Custom tertiary tier — count badges, slider ticks, tiny right-aligned meta.
  meta: {
    fontSize: '0.625rem',
    lineHeight: 1.3,
    letterSpacing: 0.1,
    fontFamily: `'Plus Jakarta Sans', 'Noto Sans SC', system-ui, sans-serif`,
  },
  button: {
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'none',
    letterSpacing: 0.1,
  },
}

export function createSakuraTheme(
  mode: 'light' | 'dark',
  extra?: ThemeOptions,
  ...args: object[]
): Theme {
  const palette = mode === 'dark' ? SAKURA_DARK : SAKURA_LIGHT
  return createTheme(
    {
      palette,
      shape: { borderRadius: 8 },
      typography: sakuraTypography,
      components: sakuraComponents,
    },
    extra ?? {},
    ...args
  )
}

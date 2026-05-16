import {
  alpha,
  createTheme,
  type PaletteOptions,
  type Theme,
  type ThemeOptions,
} from '@mui/material/styles'

// Self-host display + body fonts. MV3 CSP blocks Google Fonts CDN.
// The browser only fetches woff2 once Sakura is applied and the families resolve.
import '@fontsource/fraunces/latin-600.css'
import '@fontsource/fraunces/latin-700.css'
import '@fontsource/plus-jakarta-sans/latin-400.css'
import '@fontsource/plus-jakarta-sans/latin-500.css'
import '@fontsource/plus-jakarta-sans/latin-600.css'
import '@fontsource/plus-jakarta-sans/latin-700.css'
import '@fontsource/noto-sans-sc/chinese-simplified-400.css'
import '@fontsource/noto-sans-sc/chinese-simplified-500.css'
import '@fontsource/noto-sans-sc/chinese-simplified-700.css'

declare module '@mui/material/styles' {
  interface Palette {
    paperAlt: string
    primarySoft: string
  }
  interface PaletteOptions {
    paperAlt?: string
    primarySoft?: string
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    soft: true
  }
}

const SAKURA_LIGHT: PaletteOptions = {
  mode: 'light',
  primary: {
    main: '#E86A8E',
    dark: '#D9567C',
    light: '#FCE5EC',
    contrastText: '#ffffff',
  },
  secondary: { main: '#7A6CE0' },
  error: { main: '#E5536B' },
  warning: { main: '#E9A23B' },
  info: { main: '#5AA7E8' },
  success: { main: '#2FAE78' },
  background: { default: '#FFF8F5', paper: '#FFFFFF' },
  text: { primary: '#2A1B24', secondary: '#7A6A74' },
  divider: 'rgba(42,27,36,0.09)',
  paperAlt: '#FBEFEA',
  primarySoft: '#FCE5EC',
}

const SAKURA_DARK: PaletteOptions = {
  mode: 'dark',
  primary: {
    main: '#F48FB1',
    dark: '#F06292',
    light: 'rgba(244,143,177,0.18)',
    contrastText: '#2A0F1A',
  },
  secondary: { main: '#B39CF5' },
  error: { main: '#F0879A' },
  warning: { main: '#F5C26B' },
  info: { main: '#7FC0F0' },
  success: { main: '#6DD7A6' },
  background: { default: '#15101A', paper: '#1D1623' },
  text: { primary: '#F6E8EE', secondary: '#A89AA6' },
  divider: 'rgba(246,232,238,0.09)',
  paperAlt: '#241C2C',
  primarySoft: 'rgba(244,143,177,0.18)',
}

const sakuraComponents: ThemeOptions['components'] = {
  // Density defaults — responsible for most of the visual tightening
  MuiButton: {
    defaultProps: { size: 'small', disableElevation: true },
    styleOverrides: {
      root: { borderRadius: 8, fontWeight: 600, paddingInline: 10 },
      sizeSmall: { minHeight: 28, fontSize: 12, paddingInline: 10 },
      sizeMedium: { minHeight: 32 },
    },
    variants: [
      {
        props: { variant: 'soft', color: 'primary' },
        style: ({ theme }) => ({
          backgroundColor: theme.palette.primarySoft,
          color: theme.palette.primary.main,
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.18),
          },
        }),
      },
      {
        props: { variant: 'soft', color: 'secondary' },
        style: ({ theme }) => ({
          backgroundColor: alpha(theme.palette.secondary.main, 0.14),
          color: theme.palette.secondary.main,
          '&:hover': {
            backgroundColor: alpha(theme.palette.secondary.main, 0.22),
          },
        }),
      },
      {
        props: { variant: 'soft', color: 'error' },
        style: ({ theme }) => ({
          backgroundColor: alpha(theme.palette.error.main, 0.14),
          color: theme.palette.error.main,
          '&:hover': {
            backgroundColor: alpha(theme.palette.error.main, 0.22),
          },
        }),
      },
    ],
  },
  MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
  MuiSelect: { defaultProps: { size: 'small' } },
  MuiIconButton: { defaultProps: { size: 'small' } },
  MuiTable: { defaultProps: { size: 'small' } },
  MuiList: { defaultProps: { dense: true } },

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
      root: { height: 22, fontSize: 11, fontWeight: 600, letterSpacing: 0.1 },
      sizeSmall: { height: 22 },
      filled: ({ theme, ownerState }) => {
        const c = ownerState.color
        if (!c || c === 'default') {
          return {
            backgroundColor: theme.palette.paperAlt,
            color: theme.palette.text.primary,
          }
        }
        const pal = theme.palette[
          c as
            | 'primary'
            | 'secondary'
            | 'error'
            | 'warning'
            | 'info'
            | 'success'
        ] as { main: string } | undefined
        if (!pal?.main) {
          return {}
        }
        return { backgroundColor: alpha(pal.main, 0.18), color: pal.main }
      },
      outlined: ({ theme }) => ({
        borderColor: theme.palette.divider,
        color: theme.palette.text.secondary,
        backgroundColor: 'transparent',
      }),
    },
  },

  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 8,
        backgroundColor: theme.palette.paperAlt,
        fontSize: 12.5,
      }),
      input: { padding: '7px 10px' },
      notchedOutline: ({ theme }) => ({ borderColor: theme.palette.divider }),
    },
  },
  MuiInputLabel: {
    styleOverrides: { root: { fontSize: 12.5 } },
  },

  MuiListItemButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 8,
        padding: '6px 8px',
        '&.Mui-selected': {
          backgroundColor: theme.palette.primarySoft,
          color: theme.palette.primary.main,
          '&:hover': { backgroundColor: theme.palette.primarySoft },
        },
      }),
    },
  },
  MuiListItemText: {
    styleOverrides: {
      primary: { fontSize: 12.5, fontWeight: 500 },
      secondary: ({ theme }) => ({
        fontSize: 10.5,
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
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        minHeight: 0,
        padding: '8px 10px',
        fontSize: 12,
        fontWeight: 600,
      },
    },
  },

  MuiAlert: {
    styleOverrides: {
      root: { borderRadius: 8, padding: '6px 10px', fontSize: 11.5 },
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
        fontSize: 11,
        backgroundColor: theme.palette.mode === 'dark' ? '#3A2E3A' : '#2A1B24',
        color: '#fff',
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
  },
  h2: {
    fontFamily: `'Fraunces', 'Plus Jakarta Sans', serif`,
    fontWeight: 700,
  },
  h3: {
    fontFamily: `'Fraunces', 'Plus Jakarta Sans', serif`,
    fontWeight: 700,
    fontSize: '1.05rem',
  },
  h4: {
    fontFamily: `'Fraunces', 'Plus Jakarta Sans', serif`,
    fontWeight: 700,
    fontSize: '0.95rem',
  },
  button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0.1 },
  body1: { fontSize: '0.8125rem' },
  body2: { fontSize: '0.75rem' },
  caption: { fontSize: '0.6875rem', letterSpacing: 0.1 },
  overline: {
    fontSize: '0.625rem',
    fontWeight: 700,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
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

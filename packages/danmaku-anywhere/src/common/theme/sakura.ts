import {
  alpha,
  createTheme,
  type PaletteOptions,
  type Theme,
  type ThemeOptions,
} from '@mui/material/styles'
import type * as React from 'react'

type SeverityKey = 'success' | 'warning' | 'info' | 'error'

declare module '@mui/material/styles' {
  interface Palette {
    paperAlt: string
    primaryInk: string
    secondaryInk: string
    severityInk: Record<SeverityKey, string>
    actionActive: string
    tooltipBg: string
    tooltipFg: string
  }
  interface PaletteOptions {
    paperAlt?: string
    primaryInk?: string
    secondaryInk?: string
    severityInk?: Record<SeverityKey, string>
    actionActive?: string
    tooltipBg?: string
    tooltipFg?: string
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    soft: true
  }
  interface ButtonPropsSizeOverrides {
    xs: true
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
  error: { main: '#DC2626', dark: '#991B1B', light: '#FEE2E2' },
  warning: { main: '#E9A23B', dark: '#9A6A1E', light: '#FBE9CC' },
  info: { main: '#5AA7E8', dark: '#2F6FAF', light: '#E0EEF9' },
  success: { main: '#2FAE78', dark: '#1E7E58', light: '#D6F0E4' },
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
    error: '#991B1B',
  },
  actionActive: 'rgba(232,106,142,0.08)',
  tooltipBg: '#2A1B24',
  tooltipFg: '#FFFFFF',
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
  error: { main: '#F87171', dark: '#991B1B', light: 'rgba(248,113,113,0.18)' },
  warning: {
    main: '#F5C26B',
    dark: '#F5C26B',
    light: 'rgba(245,194,107,0.16)',
  },
  info: { main: '#7FC0F0', dark: '#7FC0F0', light: 'rgba(127,192,240,0.16)' },
  success: {
    main: '#6DD7A6',
    dark: '#6DD7A6',
    light: 'rgba(109,215,166,0.16)',
  },
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
    error: '#FCA5A5',
  },
  actionActive: 'rgba(244,143,177,0.10)',
  tooltipBg: '#3A2E3A',
  tooltipFg: '#F6E8EE',
}

const severityKeys: readonly SeverityKey[] = [
  'success',
  'warning',
  'info',
  'error',
] as const

function buildSakuraComponents(
  pxToRem: (px: number) => string
): ThemeOptions['components'] {
  return {
    MuiButton: {
      defaultProps: { size: 'small', disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600, paddingInline: 10 },
        sizeSmall: { minHeight: 28, paddingInline: 10 },
        sizeMedium: { minHeight: 32 },
      },
      variants: [
        {
          props: { size: 'xs' },
          style: { minHeight: 26, paddingInline: 10, fontSize: pxToRem(12) },
        },
        {
          props: { variant: 'soft', color: 'primary' },
          style: ({ theme }) => ({
            backgroundColor: theme.palette.primary.light,
            color: theme.palette.primary.main,
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
        root: { borderRadius: 8 },
      },
    },
    MuiTable: { defaultProps: { size: 'small' } },
    MuiList: { defaultProps: { dense: true } },

    MuiSvgIcon: {
      styleOverrides: {
        root: { fontSize: pxToRem(18) },
        fontSizeSmall: { fontSize: pxToRem(16) },
        fontSizeLarge: { fontSize: pxToRem(24) },
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
        sizeSmall: { height: 22, fontSize: pxToRem(11) },
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
        outlined: ({ theme, ownerState }) => {
          const c = ownerState.color
          if (!c || c === 'default') {
            return {
              borderColor: theme.palette.divider,
              color: theme.palette.text.secondary,
              backgroundColor: 'transparent',
            }
          }
          if (c === 'primary') {
            return {
              borderColor: theme.palette.primary.main,
              color: theme.palette.primaryInk,
              backgroundColor: 'transparent',
            }
          }
          if (c === 'secondary') {
            return {
              borderColor: theme.palette.secondary.main,
              color: theme.palette.secondaryInk,
              backgroundColor: 'transparent',
            }
          }
          if ((severityKeys as readonly string[]).includes(c)) {
            const sev = c as SeverityKey
            return {
              borderColor: theme.palette[sev].main,
              color: theme.palette.severityInk[sev],
              backgroundColor: 'transparent',
            }
          }
          return {}
        },
      },
    },

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
          transition: theme.transitions.create(['box-shadow', 'border-color'], {
            duration: theme.transitions.duration.shortest,
          }),
          '&.Mui-focused': {
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.18)}`,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
            borderWidth: 1,
          },
        }),
        input: { padding: '7px 10px' },
        notchedOutline: ({ theme }) => ({ borderColor: theme.palette.divider }),
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { fontSize: pxToRem(13) } },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 8,
          padding: theme.spacing(0.75, 1),
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
          fontSize: pxToRem(12),
          color: theme.palette.text.secondary,
        }),
      },
    },
    MuiListItemIcon: {
      styleOverrides: { root: { minWidth: 28 } },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: { height: 2 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          padding: '8px 10px',
          fontSize: pxToRem(13),
          fontWeight: 600,
        },
      },
    },

    MuiTypography: {
      defaultProps: {
        variantMapping: {
          meta: 'span',
        },
      },
      styleOverrides: {
        // Section labels read as muted secondary text by default.
        overline: ({ theme }) => ({ color: theme.palette.text.secondary }),
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: ({ ownerState, theme }) => {
          const severity = ownerState.severity || 'error'
          const severityColors = {
            success: {
              backgroundColor: theme.palette.success.light,
              color:
                theme.palette.severityInk?.success ||
                theme.palette.success.dark,
            },
            info: {
              backgroundColor: theme.palette.info.light,
              color: theme.palette.severityInk?.info || theme.palette.info.dark,
            },
            warning: {
              backgroundColor: theme.palette.warning.light,
              color:
                theme.palette.severityInk?.warning ||
                theme.palette.warning.dark,
            },
            error: {
              backgroundColor: theme.palette.error.light,
              color:
                theme.palette.severityInk?.error || theme.palette.error.dark,
            },
          }
          return {
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: pxToRem(13),
            ...(severityColors[severity] || {}),
          }
        },
        icon: ({ ownerState, theme }) => {
          const sev = ownerState.severity
          if (!sev) {
            return {}
          }
          return { color: theme.palette.severityInk?.[sev] || 'currentColor' }
        },
        action: ({ theme }) => ({
          alignItems: 'center',
          padding: `0 0 0 ${theme.spacing(1)}`,
        }),
      },
    },

    MuiSwitch: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: { padding: 6 },
      },
    },
    MuiSlider: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        markLabel: { fontSize: pxToRem(10), lineHeight: 1.3 },
        valueLabel: { fontSize: pxToRem(10) },
      },
    },

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
          ...theme.typography.caption,
          fontWeight: 500,
          backgroundColor: theme.palette.tooltipBg,
          color: theme.palette.tooltipFg,
          borderRadius: 8,
          padding: '8px 10px',
          boxShadow: '0 10px 24px -10px rgba(0,0,0,0.4)',
          maxWidth: 260,
        }),
        arrow: ({ theme }) => ({
          color: theme.palette.tooltipBg,
        }),
      },
    },
  }
}

export const MONOSPACE_FONT_FAMILY =
  'ui-monospace, SFMono-Regular, Menlo, monospace'

/** Sakura design system: AppBar / TabToolbar / WindowToolbar height in px. */
export const TOOLBAR_MIN_HEIGHT = 44

function buildSakuraTypography(
  pxToRem: (px: number) => string
): ThemeOptions['typography'] {
  return {
    fontFamily: `'Plus Jakarta Sans Variable', 'Noto Sans SC Variable', 'Noto Sans TC Variable', 'Noto Sans JP Variable', system-ui, sans-serif`,
    h1: { fontWeight: 700, fontSize: pxToRem(22), lineHeight: 1.3 },
    h2: { fontWeight: 700, fontSize: pxToRem(18), lineHeight: 1.3 },
    h3: { fontWeight: 700, fontSize: pxToRem(16), lineHeight: 1.3 },
    h4: { fontWeight: 700, fontSize: pxToRem(15), lineHeight: 1.3 },
    h5: { fontWeight: 700, fontSize: pxToRem(14), lineHeight: 1.3 },
    h6: { fontWeight: 700, fontSize: pxToRem(13), lineHeight: 1.3 },
    body1: { fontSize: pxToRem(14), lineHeight: 1.45 },
    body2: { fontSize: pxToRem(13), lineHeight: 1.4 },
    caption: { fontSize: pxToRem(12), lineHeight: 1.35, letterSpacing: 0.1 },
    overline: {
      fontSize: pxToRem(12),
      lineHeight: 1.4,
      fontWeight: 700,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    meta: {
      fontSize: pxToRem(10),
      lineHeight: 1.3,
      letterSpacing: 0.1,
    },
    button: {
      fontSize: pxToRem(12),
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: 0.1,
    },
  }
}

export function createSakuraTheme(
  mode: 'light' | 'dark',
  extra?: ThemeOptions,
  locale?: object
): Theme {
  const palette = mode === 'dark' ? SAKURA_DARK : SAKURA_LIGHT
  // htmlFontSize must go in the first createTheme arg so MUI's pxToRem
  // closure binds to it. Merging from `extra` afterwards updates the data
  // but leaves pxToRem bound to the default 16.
  const htmlFontSize = extractHtmlFontSize(extra)
  const base = createTheme({ typography: { htmlFontSize } })
  const pxToRem = base.typography.pxToRem
  return createTheme(
    {
      palette,
      shape: { borderRadius: 8 },
      typography: {
        htmlFontSize,
        ...buildSakuraTypography(pxToRem),
      },
      components: buildSakuraComponents(pxToRem),
    },
    extra ?? {},
    locale ?? {}
  )
}

function extractHtmlFontSize(extra?: ThemeOptions): number | undefined {
  const typography = extra?.typography
  if (!typography || typeof typography === 'function') {
    return undefined
  }
  return typography.htmlFontSize
}

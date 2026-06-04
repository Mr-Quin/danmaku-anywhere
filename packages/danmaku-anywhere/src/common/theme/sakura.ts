import {
  alpha,
  createTheme,
  type PaletteOptions,
  type Theme,
  type ThemeOptions,
} from '@mui/material/styles'
import type * as React from 'react'
import {
  type SakuraPalette,
  sakuraDark,
  sakuraFontFamily,
  sakuraLight,
  sakuraMonoFontFamily,
} from '@/common/theme/sakuraTokens'

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

function toPaletteOptions(
  mode: 'light' | 'dark',
  t: SakuraPalette
): PaletteOptions {
  // MUI uses palette[color].dark for emphasis (e.g. contained-button hover).
  // The original palettes used the severity ink in light mode and the severity
  // main in dark mode; preserve that so hover states don't shift.
  const severityDark = (s: SakuraPalette['success']) =>
    mode === 'light' ? s.ink : s.main
  return {
    mode,
    primary: {
      main: t.primary.main,
      dark: t.primary.hover,
      light: t.primary.soft,
      contrastText: t.primary.on,
    },
    secondary: {
      main: t.secondary.main,
      dark: t.secondary.hover,
      light: t.secondary.soft,
      contrastText: t.secondary.on,
    },
    error: {
      main: t.danger.main,
      dark: severityDark(t.danger),
      light: t.danger.soft,
    },
    warning: {
      main: t.warning.main,
      dark: severityDark(t.warning),
      light: t.warning.soft,
    },
    info: { main: t.info.main, dark: severityDark(t.info), light: t.info.soft },
    success: {
      main: t.success.main,
      dark: severityDark(t.success),
      light: t.success.soft,
    },
    background: { default: t.bg, paper: t.paper },
    text: {
      primary: t.text,
      secondary: t.textMuted,
      disabled: t.textDisabled,
    },
    divider: t.divider,
    action: {
      hover: t.actionHover,
      selected: t.actionSelected,
      focus: t.actionFocus,
    },
    paperAlt: t.paperAlt,
    primaryInk: t.primary.ink,
    secondaryInk: t.secondary.ink,
    severityInk: {
      success: t.success.ink,
      warning: t.warning.ink,
      info: t.info.ink,
      error: t.danger.ink,
    },
    actionActive: t.actionActive,
    tooltipBg: t.tooltipBg,
    tooltipFg: t.tooltipFg,
  }
}

const SAKURA_LIGHT: PaletteOptions = toPaletteOptions('light', sakuraLight)

const SAKURA_DARK: PaletteOptions = toPaletteOptions('dark', sakuraDark)

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

export const MONOSPACE_FONT_FAMILY = sakuraMonoFontFamily

/** Sakura design system: AppBar / TabToolbar / WindowToolbar height in px. */
export const TOOLBAR_MIN_HEIGHT = 44

function buildSakuraTypography(
  pxToRem: (px: number) => string
): ThemeOptions['typography'] {
  return {
    fontFamily: sakuraFontFamily,
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

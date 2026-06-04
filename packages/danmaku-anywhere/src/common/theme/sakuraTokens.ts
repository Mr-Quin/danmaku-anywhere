/**
 * Sakura design tokens as plain, framework-free data.
 *
 * This module has zero imports so it can be consumed both by the MUI theme
 * (`sakura.ts`) and by the MUI-free player frame, which builds a CSS custom
 * property block from these values. Keep it dependency-free.
 */

export interface SakuraSeverity {
  main: string
  soft: string
  ink: string
}

export interface SakuraBrand {
  main: string
  hover: string
  soft: string
  ink: string
  on: string
}

export interface SakuraPalette {
  primary: SakuraBrand
  secondary: SakuraBrand
  success: SakuraSeverity
  warning: SakuraSeverity
  info: SakuraSeverity
  danger: SakuraSeverity
  bg: string
  paper: string
  paperAlt: string
  text: string
  textMuted: string
  textDisabled: string
  divider: string
  actionHover: string
  actionSelected: string
  actionActive: string
  actionFocus: string
  tooltipBg: string
  tooltipFg: string
}

export const sakuraLight: SakuraPalette = {
  primary: {
    main: '#E86A8E',
    hover: '#D9567C',
    soft: '#FCE5EC',
    ink: '#B14267',
    on: '#FFFFFF',
  },
  secondary: {
    main: '#7A6CE0',
    hover: '#6957D3',
    soft: '#E7E3FC',
    ink: '#4A3CB8',
    on: '#FFFFFF',
  },
  success: { main: '#2FAE78', soft: '#D6F0E4', ink: '#1E7E58' },
  warning: { main: '#E9A23B', soft: '#FBE9CC', ink: '#9A6A1E' },
  info: { main: '#5AA7E8', soft: '#E0EEF9', ink: '#2F6FAF' },
  danger: { main: '#DC2626', soft: '#FEE2E2', ink: '#991B1B' },
  bg: '#FFF8F5',
  paper: '#FFFFFF',
  paperAlt: '#FBEFEA',
  text: '#2A1B24',
  textMuted: '#7A6A74',
  textDisabled: 'rgba(42,27,36,0.40)',
  divider: 'rgba(42,27,36,0.09)',
  actionHover: 'rgba(42,27,36,0.04)',
  actionSelected: '#FCE5EC',
  actionActive: 'rgba(232,106,142,0.08)',
  actionFocus: 'rgba(232,106,142,0.20)',
  tooltipBg: '#2A1B24',
  tooltipFg: '#FFFFFF',
}

export const sakuraDark: SakuraPalette = {
  primary: {
    main: '#F48FB1',
    hover: '#F06292',
    soft: 'rgba(244,143,177,0.18)',
    ink: '#F8BBD0',
    on: '#2A0F1A',
  },
  secondary: {
    main: '#B39CF5',
    hover: '#9F86F0',
    soft: 'rgba(179,156,245,0.18)',
    ink: '#C8B6F7',
    on: '#1A1330',
  },
  success: { main: '#6DD7A6', soft: 'rgba(109,215,166,0.16)', ink: '#9CEAC4' },
  warning: { main: '#F5C26B', soft: 'rgba(245,194,107,0.16)', ink: '#F5D699' },
  info: { main: '#7FC0F0', soft: 'rgba(127,192,240,0.16)', ink: '#A8D4F5' },
  danger: { main: '#F87171', soft: 'rgba(248,113,113,0.18)', ink: '#FCA5A5' },
  bg: '#15101A',
  paper: '#1D1623',
  paperAlt: '#241C2C',
  text: '#F6E8EE',
  textMuted: '#A89AA6',
  textDisabled: 'rgba(246,232,238,0.40)',
  divider: 'rgba(246,232,238,0.09)',
  actionHover: 'rgba(246,232,238,0.05)',
  actionSelected: 'rgba(244,143,177,0.18)',
  actionActive: 'rgba(244,143,177,0.10)',
  actionFocus: 'rgba(244,143,177,0.28)',
  tooltipBg: '#3A2E3A',
  tooltipFg: '#F6E8EE',
}

export const sakuraPalette = {
  light: sakuraLight,
  dark: sakuraDark,
} as const

export const sakuraRadii = {
  control: 8,
  card: 12,
  root: 18,
} as const

export const sakuraFontFamily = `'Plus Jakarta Sans Variable', 'Noto Sans SC Variable', 'Noto Sans TC Variable', 'Noto Sans JP Variable', system-ui, sans-serif`

export const sakuraMonoFontFamily =
  'ui-monospace, SFMono-Regular, Menlo, monospace'

/** Type scale in px at a 16px base. */
export const sakuraFontSize = {
  h1: 22,
  h2: 18,
  h3: 16,
  h4: 15,
  h5: 14,
  h6: 13,
  body1: 14,
  body2: 13,
  caption: 12,
  overline: 11,
  meta: 10,
  button: 12,
} as const

/** Base spacing unit in px (MUI-compatible 8px grid). */
export const sakuraSpacingUnit = 8

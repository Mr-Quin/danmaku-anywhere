import {
  type SakuraPalette,
  sakuraFontFamily,
  sakuraFontSize,
  sakuraMonoFontFamily,
  sakuraPalette,
  sakuraRadii,
} from '@/common/theme/sakuraTokens'

/**
 * Builds a `:host` block of `--da-*` custom properties from the Sakura tokens,
 * for the MUI-free player frame to consume in plain CSS. Defined on `:host` so
 * the values inherit to everything mounted in the player shadow root.
 */
export function buildSakuraCssVars(mode: 'light' | 'dark' = 'dark'): string {
  const p: SakuraPalette = sakuraPalette[mode]
  const vars: Record<string, string> = {
    '--da-font': sakuraFontFamily,
    '--da-font-mono': sakuraMonoFontFamily,
    '--da-surface': p.paper,
    '--da-surface-alt': p.paperAlt,
    '--da-text': p.text,
    '--da-text-muted': p.textMuted,
    '--da-divider': p.divider,
    '--da-primary': p.primary.main,
    '--da-primary-soft': p.primary.soft,
    '--da-success': p.success.main,
    '--da-success-ink': p.success.ink,
    '--da-info': p.info.main,
    '--da-info-ink': p.info.ink,
    '--da-warning': p.warning.main,
    '--da-warning-ink': p.warning.ink,
    '--da-danger': p.danger.main,
    '--da-danger-ink': p.danger.ink,
    '--da-radius-card': `${sakuraRadii.card}px`,
    '--da-radius-control': `${sakuraRadii.control}px`,
    '--da-fs-body2': `${sakuraFontSize.body2}px`,
    '--da-fs-caption': `${sakuraFontSize.caption}px`,
    '--da-fs-overline': `${sakuraFontSize.overline}px`,
    '--da-fs-meta': `${sakuraFontSize.meta}px`,
  }
  const body = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n')
  return `:host {\n${body}\n}\n`
}

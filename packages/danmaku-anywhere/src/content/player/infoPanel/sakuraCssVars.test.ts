import { describe, expect, it } from 'vitest'
import { sakuraDark, sakuraLight } from '@/common/theme/sakuraTokens'
import { buildSakuraCssVars } from './sakuraCssVars'

describe('buildSakuraCssVars', () => {
  it('emits a :host block with dark token values by default', () => {
    const css = buildSakuraCssVars()
    expect(css).toContain(':host {')
    expect(css).toContain(`--da-success: ${sakuraDark.success.main};`)
    expect(css).toContain(`--da-danger: ${sakuraDark.danger.main};`)
    expect(css).toContain('--da-radius-card: 12px;')
    expect(css).toContain('--da-fs-overline: 11px;')
  })

  it('emits light token values when asked', () => {
    const css = buildSakuraCssVars('light')
    expect(css).toContain(`--da-success: ${sakuraLight.success.main};`)
    expect(css).toContain(`--da-text: ${sakuraLight.text};`)
  })
})

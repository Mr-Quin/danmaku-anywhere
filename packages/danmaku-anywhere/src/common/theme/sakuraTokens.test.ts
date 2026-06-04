import { describe, expect, it } from 'vitest'
import { createSakuraTheme } from '@/common/theme/sakura'
import { sakuraDark, sakuraLight } from '@/common/theme/sakuraTokens'

describe('sakura theme is built from sakuraTokens', () => {
  it('light palette matches tokens', () => {
    const { palette } = createSakuraTheme('light')
    expect(palette.primary.main).toBe(sakuraLight.primary.main)
    expect(palette.primary.light).toBe(sakuraLight.primary.soft)
    expect(palette.success.main).toBe(sakuraLight.success.main)
    expect(palette.severityInk.error).toBe(sakuraLight.danger.ink)
    expect(palette.background.paper).toBe(sakuraLight.paper)
    expect(palette.paperAlt).toBe(sakuraLight.paperAlt)
  })

  it('dark palette matches tokens', () => {
    const { palette } = createSakuraTheme('dark')
    expect(palette.primary.main).toBe(sakuraDark.primary.main)
    expect(palette.success.main).toBe(sakuraDark.success.main)
    expect(palette.info.main).toBe(sakuraDark.info.main)
    expect(palette.error.main).toBe(sakuraDark.danger.main)
    expect(palette.severityInk.success).toBe(sakuraDark.success.ink)
    expect(palette.text.primary).toBe(sakuraDark.text)
  })

  it('preserves severity emphasis (.dark) used by contained-button hover', () => {
    expect(createSakuraTheme('light').palette.success.dark).toBe(
      sakuraLight.success.ink
    )
    expect(createSakuraTheme('dark').palette.success.dark).toBe(
      sakuraDark.success.main
    )
  })
})

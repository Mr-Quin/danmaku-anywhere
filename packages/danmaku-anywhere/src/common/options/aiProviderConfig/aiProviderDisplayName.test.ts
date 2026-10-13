import { describe, expect, it } from 'vitest'
import { aiProviderDisplayName } from './aiProviderDisplayName'
import { BUILT_IN_AI_PROVIDER } from './constant'

/**
 * The built-in AI provider is stored with an English name, so it is shown
 * under a translated name instead. User-created providers keep the name the
 * user gave them. The i18n mock returns keys.
 */

describe('aiProviderDisplayName', () => {
  it('translates the built-in provider name', () => {
    expect(aiProviderDisplayName(BUILT_IN_AI_PROVIDER)).toBe('ai.builtInName')
  })

  it('keeps the name of a user-created provider', () => {
    expect(aiProviderDisplayName({ id: 'abc', name: 'My OpenAI' })).toBe(
      'My OpenAI'
    )
  })
})

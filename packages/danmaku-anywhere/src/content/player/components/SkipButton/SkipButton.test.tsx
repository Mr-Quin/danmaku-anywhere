import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@/common/localization/i18n'
import { SkipTarget } from '@/content/player/videoSkip/SkipTarget'
import { SkipButton } from './SkipButton'

/**
 * The skip button's jump label and close button follow the extension
 * language. Renders the button in English and Chinese and reads both labels.
 */

vi.unmock('@/common/localization/i18n')

let root: Root | undefined

afterEach(async () => {
  act(() => {
    root?.unmount()
  })
  root = undefined
  await i18n.changeLanguage('en')
})

function renderSkipButton() {
  const element = document.createElement('div')
  root = createRoot(element)
  act(() => {
    root?.render(
      <SkipButton
        target={new SkipTarget({ startTime: 10, endTime: 95 })}
        onClick={() => undefined}
        onClose={() => undefined}
      />
    )
  })
  return element
}

describe('SkipButton', () => {
  it('labels the jump in English', async () => {
    await i18n.changeLanguage('en')
    const element = renderSkipButton()

    expect(element.querySelector('.da-text-button')?.textContent).toBe(
      'Skip to 01:35'
    )
    expect(
      element.querySelector('.da-close-button')?.getAttribute('aria-label')
    ).toBe('Close')
  })

  it('labels the jump in Chinese', async () => {
    await i18n.changeLanguage('zh')
    const element = renderSkipButton()

    expect(element.querySelector('.da-text-button')?.textContent).toBe(
      '空降至 01:35'
    )
    expect(
      element.querySelector('.da-close-button')?.getAttribute('aria-label')
    ).toBe('关闭')
  })
})

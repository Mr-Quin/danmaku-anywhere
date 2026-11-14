import { Component, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { describe, expect, it } from 'vitest'
import { IMAGE_PLACEHOLDER_DATA } from '../placeholder-data'
import { DaImage } from './da-image'

/**
 * Bangumi's image host drops the first request for a cold image, so a failed
 * load is retried once with a fragment that changes the cache key. A second
 * failure falls back to the placeholder instead of looping, and a new src
 * starts the cycle over.
 */

@Component({
  imports: [DaImage],
  template: `<da-image [src]="src()" />`,
})
class Host {
  readonly src = signal('https://lain.bgm.tv/cover.jpg')
}

function setup(src: string) {
  TestBed.configureTestingModule({ imports: [Host] })
  const fixture = TestBed.createComponent(Host)
  fixture.componentInstance.src.set(src)
  fixture.detectChanges()
  const img = fixture.nativeElement.querySelector('img') as HTMLImageElement
  return { fixture, img }
}

describe('DaImage', () => {
  it('renders the source it was given', () => {
    const { img } = setup('https://lain.bgm.tv/cover.jpg')

    expect(img.getAttribute('src')).toBe('https://lain.bgm.tv/cover.jpg')
  })

  it('retries a failed load once with a cache-busting fragment', () => {
    const { fixture, img } = setup('https://lain.bgm.tv/cover.jpg')

    img.dispatchEvent(new Event('error'))
    fixture.detectChanges()

    expect(img.getAttribute('src')).toBe(
      'https://lain.bgm.tv/cover.jpg#daRetry=1'
    )
  })

  it('falls back to the placeholder when the retry fails too', () => {
    const { fixture, img } = setup('https://lain.bgm.tv/cover.jpg')

    img.dispatchEvent(new Event('error'))
    fixture.detectChanges()
    img.dispatchEvent(new Event('error'))
    fixture.detectChanges()

    expect(img.getAttribute('src')).toBe(IMAGE_PLACEHOLDER_DATA)
  })

  it('does not retry an empty source', () => {
    const { fixture, img } = setup('')

    img.dispatchEvent(new Event('error'))
    fixture.detectChanges()

    expect(img.getAttribute('src')).toBe(IMAGE_PLACEHOLDER_DATA)
  })

  it('retries again after the source changes', () => {
    const { fixture, img } = setup('https://lain.bgm.tv/cover.jpg')

    img.dispatchEvent(new Event('error'))
    fixture.detectChanges()
    img.dispatchEvent(new Event('error'))
    fixture.detectChanges()

    fixture.componentInstance.src.set('https://lain.bgm.tv/other.jpg')
    fixture.detectChanges()
    img.dispatchEvent(new Event('error'))
    fixture.detectChanges()

    expect(img.getAttribute('src')).toBe(
      'https://lain.bgm.tv/other.jpg#daRetry=1'
    )
  })
})
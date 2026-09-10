import { TestBed } from '@angular/core/testing'

import { provideTestApp } from '../../shared/testing/provide-test-app'
import { VideoPlayer } from './video-player'

/**
 * VideoPlayer wraps Artplayer and exposes the video host slot. Under the test
 * providers (which supply the MessageService the VideoService depends on) the
 * component instantiates and renders its Artplayer mount point. Asserts the
 * component creates and the host div is present in the DOM.
 */
describe('VideoPlayer', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [VideoPlayer],
      providers: provideTestApp(),
    })
  })

  it('creates and renders the player host', async () => {
    const fixture = TestBed.createComponent(VideoPlayer)
    fixture.componentRef.setInput('poster', '/fake-cover.svg')
    await fixture.whenStable()
    expect(fixture.componentInstance).toBeTruthy()
    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector('.aspect-video')).not.toBeNull()
  })
})

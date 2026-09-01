import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { provideServiceWorker } from '@angular/service-worker'

import { provideTestApp } from '../../shared/testing/provide-test-app'
import { Layout } from './layout.component'

/**
 * Layout is the legacy router-driven chrome (app bar, sidebar, outlet). Under
 * the fake backend the extension reads as installed, so the no-extension page
 * stays out of the DOM and the router-outlet renders. Asserts the component
 * mounts and shows the outlet rather than the no-extension fallback.
 */
describe('Layout', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Layout],
      providers: [
        ...provideTestApp(),
        provideRouter([]),
        provideServiceWorker('ngsw-worker.js', { enabled: false }),
      ],
    })
  })

  it('mounts and renders the router outlet, not the no-extension page', async () => {
    const fixture = TestBed.createComponent(Layout)
    await fixture.whenStable()
    const compiled = fixture.nativeElement as HTMLElement
    expect(fixture.componentInstance).toBeTruthy()
    expect(compiled.querySelector('router-outlet')).not.toBeNull()
    expect(compiled.querySelector('da-no-extension')).toBeNull()
  })
})

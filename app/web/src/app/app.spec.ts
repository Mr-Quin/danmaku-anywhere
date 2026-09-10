import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { App } from './app'
import { provideTestApp } from './shared/testing/provide-test-app'

/**
 * App is the root shell: it creates and renders a single router-outlet under
 * the fake-backend test providers. Asserts the component instantiates and the
 * outlet anchor is present so routing has somewhere to project into.
 */
describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [...provideTestApp(), provideRouter([])],
    })
  })

  it('creates the root component', async () => {
    const fixture = TestBed.createComponent(App)
    await fixture.whenStable()
    expect(fixture.componentInstance).toBeTruthy()
  })

  it('renders a router outlet', async () => {
    const fixture = TestBed.createComponent(App)
    await fixture.whenStable()
    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector('router-outlet')).not.toBeNull()
  })
})

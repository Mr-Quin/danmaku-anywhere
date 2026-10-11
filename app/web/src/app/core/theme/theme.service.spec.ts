import { TestBed } from '@angular/core/testing'

import { ThemeService } from './theme.service'

/**
 * Exercises ThemeService: default scheme is dark, toggle/set update the
 * colorScheme signal and the $isDark computed, and the persisting effect
 * writes the choice to localStorage and reflects it as the `da-dark` class
 * on the document element. Initial scheme is read back from localStorage.
 */
describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('da-dark')
    TestBed.configureTestingModule({})
  })

  it('defaults to dark when nothing is persisted', () => {
    const service = TestBed.inject(ThemeService)
    expect(service.$colorScheme()).toBe('dark')
    expect(service.$isDark()).toBe(true)
  })

  it('reads the persisted scheme on creation', () => {
    localStorage.setItem('da-theme', 'light')
    const service = TestBed.inject(ThemeService)
    expect(service.$colorScheme()).toBe('light')
    expect(service.$isDark()).toBe(false)
  })

  it('toggle flips the scheme and persists + applies the class', () => {
    const service = TestBed.inject(ThemeService)
    TestBed.tick()
    expect(document.documentElement.classList.contains('da-dark')).toBe(true)

    service.toggle()
    TestBed.tick()
    expect(service.$colorScheme()).toBe('light')
    expect(localStorage.getItem('da-theme')).toBe('light')
    expect(document.documentElement.classList.contains('da-dark')).toBe(false)

    service.toggle()
    TestBed.tick()
    expect(service.$colorScheme()).toBe('dark')
    expect(document.documentElement.classList.contains('da-dark')).toBe(true)
  })

  it('set applies an explicit scheme', () => {
    const service = TestBed.inject(ThemeService)
    service.set('light')
    TestBed.tick()
    expect(service.$isDark()).toBe(false)
    expect(localStorage.getItem('da-theme')).toBe('light')
  })
})

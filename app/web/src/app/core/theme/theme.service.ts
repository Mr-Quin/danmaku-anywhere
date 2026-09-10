import { isPlatformBrowser } from '@angular/common'
import {
  computed,
  effect,
  Injectable,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core'

export type ColorScheme = 'light' | 'dark'

const STORAGE_KEY = 'da-theme'
const DEFAULT_SCHEME: ColorScheme = 'dark'

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID))

  private readonly $_scheme = signal<ColorScheme>(this.readPersisted())

  readonly $colorScheme = this.$_scheme.asReadonly()
  readonly $isDark = computed(() => this.$_scheme() === 'dark')

  constructor() {
    effect(() => {
      const scheme = this.$_scheme()
      if (!this.isBrowser) {
        return
      }
      document.documentElement.classList.toggle('da-dark', scheme === 'dark')
      try {
        localStorage.setItem(STORAGE_KEY, scheme)
      } catch {
        // storage unavailable (private mode / blocked); theme still applies in-memory
      }
    })
  }

  toggle() {
    this.$_scheme.update((scheme) => (scheme === 'dark' ? 'light' : 'dark'))
  }

  set(scheme: ColorScheme) {
    this.$_scheme.set(scheme)
  }

  private readPersisted(): ColorScheme {
    if (!this.isBrowser) {
      return DEFAULT_SCHEME
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'light' || stored === 'dark') {
        return stored
      }
    } catch {
      // ignore and fall back to default
    }
    return DEFAULT_SCHEME
  }
}

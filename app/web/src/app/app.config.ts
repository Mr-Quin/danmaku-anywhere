import {
  type ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core'
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async'
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router'
import { provideServiceWorker } from '@angular/service-worker'
import { definePreset } from '@primeng/themes'
import Aura from '@primeng/themes/aura'
import { provideQueryClient } from '@tanstack/angular-query-experimental'
import { MessageService } from 'primeng/api'
import { providePrimeNG } from 'primeng/config'
import { routes } from './app.routes'
import { ClarityService } from './core/clarity.service'
import { ExtensionService } from './core/extension/extension.service'
import { queryClient } from './shared/query/queryClient'

const preset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{pink.50}',
      100: '{pink.100}',
      200: '{pink.200}',
      300: '{pink.300}',
      400: '{pink.400}',
      500: '{pink.500}',
      600: '{pink.600}',
      700: '{pink.700}',
      800: '{pink.800}',
      900: '{pink.900}',
      950: '{pink.950}',
    },
  },
})

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideQueryClient(queryClient),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
      })
    ),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset,
        options: {
          prefix: 'p',
          darkModeSelector: '.da-dark',
          cssLayer: {
            name: 'primeng',
            order: 'theme, base, primeng',
          },
        },
      },
    }),
    MessageService,
    provideAppInitializer(async () => {
      const clarityService = inject(ClarityService)
      clarityService.init()
      const extensionService = inject(ExtensionService)
      await extensionService.init()
      console.log('App initialized')
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
}

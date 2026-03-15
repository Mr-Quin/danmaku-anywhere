import { isPlatformBrowser } from '@angular/common'
import { Injectable, inject, PLATFORM_ID } from '@angular/core'
import { environment } from '../../environments/environment'

@Injectable({
  providedIn: 'root',
})
export class TrackingService {
  private platformId = inject(PLATFORM_ID)
  private clarity: typeof import('clarity-js').clarity | null = null

  identify(userId: string) {
    this.clarity?.identify(userId)
  }

  tag(key: string, value: string) {
    this.clarity?.set(key, value)
  }

  track(key: string, data?: object) {
    if (!this.clarity) {
      return
    }
    try {
      if (data !== undefined) {
        this.clarity.event(key, JSON.stringify(data))
      } else {
        this.clarity.event(key, '')
      }
    } catch (error) {
      if (!environment.production) {
        console.error('Clarity tracking error:', error)
      }
    }
  }

  async init() {
    if (!isPlatformBrowser(this.platformId)) {
      return
    }
    try {
      const { clarity } = await import('clarity-js')
      clarity.start({
        projectId: environment.clarityProjectId,
        upload: 'https://m.clarity.ms/collect',
        track: true,
        content: true,
      })
      this.clarity = clarity
      this.tag('env', environment.name)
    } catch (error) {
      this.clarity = null
      if (!environment.production) {
        console.error('Failed to initialize Clarity tracking:', error)
      }
    }
  }
}

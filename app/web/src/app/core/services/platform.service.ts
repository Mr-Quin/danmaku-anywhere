import { Platform } from '@angular/cdk/platform'
import { Injectable, inject } from '@angular/core'

@Injectable({
  providedIn: 'root',
})
export class PlatformService {
  readonly platform = inject(Platform)

  readonly isMobile = this.platform.IOS || this.platform.ANDROID
}

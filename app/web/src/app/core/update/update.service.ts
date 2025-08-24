import {
  ApplicationRef,
  effect,
  Injectable,
  inject,
  signal,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { SwUpdate } from '@angular/service-worker'
import { MessageService } from 'primeng/api'
import { TrackingService } from '../tracking.service'

@Injectable({
  providedIn: 'root',
})
export class UpdateService {
  private readonly appRef = inject(ApplicationRef)
  private readonly swUpdate = inject(SwUpdate)
  private readonly messageService = inject(MessageService)
  private readonly trackingService = inject(TrackingService)

  private timeoutId: ReturnType<typeof setTimeout> | null = null

  private readonly $isAppStable = toSignal(this.appRef.isStable, {
    initialValue: false,
  })
  private readonly $_showUpdateBanner = signal(false)

  readonly $showUpdateBanner = this.$_showUpdateBanner.asReadonly()

  readonly $versionUpdates = toSignal(this.swUpdate.versionUpdates)

  constructor() {
    this.setupUnrecoverableStateHandling()

    // handle version updates
    effect(() => {
      const versionUpdates = this.$versionUpdates()
      if (!versionUpdates) {
        return
      }
      switch (versionUpdates.type) {
        case 'VERSION_DETECTED': {
          return
        }
        case 'VERSION_READY': {
          void this.handleVersionReady()
          return
        }
        case 'VERSION_INSTALLATION_FAILED': {
          this.trackingService.track(
            'versionInstallationFailed',
            versionUpdates
          )
          return
        }
      }
    })

    effect(() => {
      if (this.$isAppStable()) {
        void this.checkForUpdate()
        this.scheduleUpdateCheck()
      }
    })
  }

  private scheduleUpdateCheck(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }
    this.timeoutId = setTimeout(() => {
      void this.checkForUpdate()
      this.scheduleUpdateCheck()
    }, 1000 * 60) // every 1 minute
  }

  private setupUnrecoverableStateHandling(): void {
    this.swUpdate.unrecoverable.subscribe(() => {
      this.messageService.add({
        severity: 'error',
        summary: '错误',
        detail: '发生了错误，请刷新页面',
        closable: false,
        life: 0,
        key: 'update-error',
      })
    })
  }

  private async handleVersionReady(): Promise<void> {
    try {
      await this.swUpdate.activateUpdate()
    } catch (error) {
      this.trackingService.track('handleVersionReadyError', { error })
    }
    this.$_showUpdateBanner.set(true)
  }

  async activateUpdate(): Promise<void> {
    this.$_showUpdateBanner.set(false)
    document.location.reload()
  }

  async checkForUpdate(): Promise<boolean> {
    try {
      return await this.swUpdate.checkForUpdate()
    } catch (error) {
      this.trackingService.track('checkForUpdateError', { error })
      return false
    }
  }

  async manualCheckForUpdate(): Promise<void> {
    const updateFound = await this.checkForUpdate()
    if (updateFound) {
      this.messageService.add({
        severity: 'info',
        summary: '发现新版本',
        life: 3000,
      })
    } else {
      this.messageService.add({
        severity: 'success',
        summary: '已是最新版本',
        life: 3000,
      })
    }
  }
}

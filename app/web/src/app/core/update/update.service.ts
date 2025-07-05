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
import { concat, interval } from 'rxjs'
import { first } from 'rxjs/operators'

@Injectable({
  providedIn: 'root',
})
export class UpdateService {
  private readonly appRef = inject(ApplicationRef)
  private readonly swUpdate = inject(SwUpdate)
  private readonly messageService = inject(MessageService)

  private readonly $_showUpdateBanner = signal(false)

  readonly $showUpdateBanner = this.$_showUpdateBanner.asReadonly()

  readonly $versionUpdates = toSignal(this.swUpdate.versionUpdates)

  constructor() {
    this.setupVersionUpdates()
    this.setupPeriodicUpdateChecks()
    this.setupUnrecoverableStateHandling()
  }

  private setupVersionUpdates(): void {
    effect(() => {
      const versionUpdates = this.$versionUpdates()
      if (!versionUpdates) {
        return
      }
      switch (versionUpdates.type) {
        case 'VERSION_DETECTED': {
          console.debug('Downloading new version...')
          return
        }
        case 'VERSION_READY': {
          console.log(
            `Current app version: ${versionUpdates.currentVersion.hash}`
          )
          console.log(
            `New app version ready for use: ${versionUpdates.latestVersion.hash}`
          )
          this.handleVersionReady()
          return
        }
        case 'VERSION_INSTALLATION_FAILED': {
          console.error(
            `Failed to install app version '${versionUpdates.version.hash}': ${versionUpdates.error}`
          )
          return
        }
      }
    })
  }

  private setupPeriodicUpdateChecks(): void {
    const appIsStable$ = this.appRef.isStable.pipe(
      first((isStable) => isStable)
    )
    const interval$ = interval(30 * 60 * 1000)
    const stableInterval$ = concat(appIsStable$, interval$)

    stableInterval$.subscribe(async () => {
      await this.checkForUpdate()
    })
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

  private handleVersionReady(): void {
    this.$_showUpdateBanner.set(true)
  }

  async activateUpdate(): Promise<void> {
    this.$_showUpdateBanner.set(false)
    document.location.reload()
  }

  async checkForUpdate(): Promise<boolean> {
    try {
      const updateFound = await this.swUpdate.checkForUpdate()
      if (updateFound) {
        console.log('A new version is available.')
      } else {
        console.log('Already on the latest version.')
      }
      return updateFound
    } catch (error) {
      console.error('Failed to check for updates:', error)
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

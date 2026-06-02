import { isPlatformBrowser } from '@angular/common'
import {
  ApplicationRef,
  type ComponentRef,
  createComponent,
  EnvironmentInjector,
  Injectable,
  inject,
  PLATFORM_ID,
} from '@angular/core'

import { KazumiDetailPage } from '../../../features/kazumi/pages/kazumi-detail-page'

/**
 * Owns the single long-lived KazumiDetailPage / Artplayer host and teleports
 * its root DOM node between the player column's dock slot and the shell PiP
 * slot. The node is moved with appendChild, never destroyed/recreated, so
 * Artplayer keeps playing across the move.
 */
@Injectable({ providedIn: 'root' })
export class PipTeleportManager {
  private readonly appRef = inject(ApplicationRef)
  private readonly envInjector = inject(EnvironmentInjector)
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID))

  private ref: ComponentRef<KazumiDetailPage> | null = null
  private dock: HTMLElement | null = null

  acquire(): ComponentRef<KazumiDetailPage> {
    if (!this.ref) {
      this.ref = createComponent(KazumiDetailPage, {
        environmentInjector: this.envInjector,
      })
      this.appRef.attachView(this.ref.hostView)
    }
    return this.ref
  }

  get hostNode(): HTMLElement | null {
    return (this.ref?.location.nativeElement as HTMLElement | null) ?? null
  }

  setDock(dock: HTMLElement) {
    this.dock = dock
  }

  /**
   * Move the host node into the dock slot (floating === false) or the shell
   * PiP slot (floating === true). The PiP slot is resolved from the DOM since
   * it lives in LaneShell, outside this manager's component tree.
   */
  teleport(floating: boolean) {
    if (!this.isBrowser) {
      return
    }
    const node = this.hostNode
    if (!node) {
      return
    }
    const target = floating ? this.pipSlot() : this.dock
    if (!target) {
      return
    }
    if (node.parentElement !== target) {
      target.appendChild(node)
    }
  }

  release() {
    if (this.ref) {
      this.appRef.detachView(this.ref.hostView)
      this.ref.destroy()
      this.ref = null
    }
    this.dock = null
  }

  private pipSlot(): HTMLElement | null {
    return document.querySelector<HTMLElement>('[data-testid="pip-slot"]')
  }
}

import { isPlatformBrowser } from '@angular/common'
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  DestroyRef,
  type ElementRef,
  effect,
  inject,
  input,
  PLATFORM_ID,
  viewChild,
} from '@angular/core'

import type { KazumiDetailPage } from '../../../features/kazumi/pages/kazumi-detail-page'
import { LaneStore } from '../lane.store'
import type { Column } from '../lane.types'
import { PipTeleportManager } from './pip-teleport'

/**
 * Wraps the kazumi player. The body renders only a dock slot; the actual
 * KazumiDetailPage / Artplayer host is a single long-lived instance owned by
 * PipTeleportManager and teleported between this dock slot and the shell PiP
 * slot. This wrapper is the only place injecting LaneStore: it feeds watch
 * params as inputs and maps the player's outputs to store ops.
 */
@Component({
  selector: 'da-player-column',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-testid': 'column-body',
    '[attr.data-kind]': "'player'",
  },
  template: `
    <div #dock class="dock" data-testid="player-dock"></div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .dock {
      height: 100%;
    }
  `,
})
export class PlayerColumn {
  readonly col = input.required<Column>()

  private readonly store = inject(LaneStore)
  private readonly pip = inject(PipTeleportManager)
  private readonly destroyRef = inject(DestroyRef)
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID))

  private readonly dockRef =
    viewChild.required<ElementRef<HTMLDivElement>>('dock')

  private ref: ComponentRef<KazumiDetailPage> | null = null

  constructor() {
    afterNextRender(() => {
      this.mount()
    })

    effect(() => {
      // Read the signals up front so the effect tracks them as dependencies
      // even on the first run when the host ref is not mounted yet.
      this.col()
      this.store.playing()
      this.syncInputs()
    })

    effect(() => {
      const floating = this.store.floating()
      if (this.ref) {
        this.pip.teleport(floating)
      }
    })

    this.destroyRef.onDestroy(() => {
      if (this.isBrowser) {
        this.pip.release()
      }
    })
  }

  private mount() {
    if (!this.isBrowser) {
      return
    }
    this.ref = this.pip.acquire()
    this.pip.setDock(this.dockRef().nativeElement)
    this.syncInputs()
    this.bindOutputs(this.ref)
    this.pip.teleport(this.store.floating())
  }

  private syncInputs() {
    const ref = this.ref
    if (!ref) {
      return
    }
    const col = this.col()
    if (col.kind !== 'player') {
      return
    }
    const playing = this.store.playing()
    ref.setInput('id', col.subjectId)
    ref.setInput('type', col.episodeType)
    ref.setInput('q', col.query ?? playing?.title)
    ref.setInput('url', col.url ?? playing?.url)
    ref.setInput('policyName', col.policyName ?? playing?.policyName)
    ref.setInput('p', col.playlist)
    ref.setInput('e', col.episode ?? playing?.episode)
  }

  private bindOutputs(ref: ComponentRef<KazumiDetailPage>) {
    const instance = ref.instance
    // These outputs belong to the long-lived host owned by PipTeleportManager,
    // so they outlive this wrapper; unsubscribe on destroy to avoid leaking a
    // subscription each time the player column is recreated.
    const subscriptions = [
      instance.episodeChange.subscribe((n: number) => {
        this.store.setEpisode(n)
      }),
      instance.sourceChange.subscribe((source: string) => {
        this.store.setSource(source)
      }),
      instance.openComments.subscribe((subjectId: number) => {
        const title = this.store.playing()?.title ?? `#${subjectId}`
        this.store.openComments(subjectId, title)
      }),
      instance.openDetails.subscribe((subjectId: number) => {
        const title = this.store.playing()?.title ?? `#${subjectId}`
        this.store.openDetails(subjectId, title)
      }),
    ]
    this.destroyRef.onDestroy(() => {
      for (const subscription of subscriptions) {
        subscription.unsubscribe()
      }
    })
  }
}

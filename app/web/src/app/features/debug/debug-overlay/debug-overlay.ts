import { isPlatformBrowser } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core'

import { environment } from '../../../../environments/environment'
import { resolveBackendImpl } from '../../../../environments/environment.interface'
import { FakeBackendRecorder } from '../../../core/backend/fake-backend-recorder'
import { LaneStore } from '../../../core/lane/lane.store'
import { ThemeService } from '../../../core/theme/theme.service'

@Component({
  selector: 'da-debug-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="fab"
      title="调试面板"
      (click)="toggle()"
    >
      <i class="pi pi-cog"></i>
    </button>

    @if (open()) {
      <aside class="panel" data-testid="debug-overlay">
        <div class="row">
          <span class="key">backend</span>
          <span class="val" data-testid="debug-backend-mode">{{ backendMode }}</span>
        </div>
        <div class="row">
          <span class="key">theme</span>
          <span class="val" data-testid="debug-theme">{{ theme() }}</span>
        </div>
        <div class="row">
          <span class="key">active</span>
          <span class="val" data-testid="debug-active-id">{{ activeId() ?? '-' }}</span>
        </div>
        <div class="row">
          <span class="key">floating</span>
          <span class="val" data-testid="debug-floating">{{ floating() }}</span>
        </div>
        <div class="row">
          <span class="key">playing</span>
          <span class="val" data-testid="debug-playing">{{ playingLabel() }}</span>
        </div>

        <div class="section">columns · {{ columns().length }}</div>
        <ul class="list" data-testid="debug-columns">
          @for (col of columns(); track col.id) {
            <li
              class="item"
              data-testid="debug-column"
              [attr.data-kind]="col.kind"
              [attr.data-column-id]="col.id"
            >
              <span class="ckind">{{ col.kind }}</span>
              <span class="cid">{{ col.id }}</span>
            </li>
          }
        </ul>

        <div class="section">calls · {{ calls().length }}</div>
        <ul class="list" data-testid="debug-backend-calls">
          @for (call of calls(); track $index) {
            <li
              class="item"
              data-testid="debug-call"
              [attr.data-action]="call.action"
              [attr.data-ok]="call.ok"
            >
              <span class="caction">{{ call.channel }}/{{ call.action }}</span>
              <span class="cargs">{{ call.argsSummary }}</span>
            </li>
          }
        </ul>

        <div class="section">snapshot</div>
        <pre class="json" data-testid="debug-store-json">{{ storeJson() }}</pre>
      </aside>
    }
  `,
  styles: `
    :host {
      position: fixed;
      left: 70px;
      bottom: 16px;
      z-index: 200;
      font-family: var(--p-mono);
    }

    .fab {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: 1px solid var(--p-divider);
      cursor: pointer;
      background: var(--p-paper);
      color: var(--p-text-muted);
      font-size: 16px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
    }

    .panel {
      position: absolute;
      left: 0;
      bottom: 42px;
      width: 320px;
      max-height: 70vh;
      overflow-y: auto;
      padding: 12px;
      background: var(--p-paper);
      border: 1px solid var(--p-divider);
      border-radius: var(--p-radius);
      box-shadow: 0 16px 44px rgba(0, 0, 0, 0.5);
      font-size: 11px;
      color: var(--p-text);
    }

    .row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      padding: 2px 0;
    }

    .key {
      color: var(--p-text-muted);
    }

    .val {
      color: var(--p-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .section {
      margin-top: 10px;
      margin-bottom: 4px;
      color: var(--p-primary-ink);
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      font-size: 10px;
    }

    .list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .item {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      padding: 2px 4px;
      border-radius: 5px;
      background: var(--p-paper-alt);
    }

    .ckind,
    .caction {
      color: var(--p-text);
    }

    .cid,
    .cargs {
      color: var(--p-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 160px;
    }

    .json {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
      font-size: 10px;
      color: var(--p-text-muted);
      background: var(--p-bg);
      padding: 8px;
      border-radius: 6px;
    }
  `,
})
export class DebugOverlay {
  private readonly store = inject(LaneStore)
  private readonly themeService = inject(ThemeService)
  private readonly recorder = inject(FakeBackendRecorder)
  private readonly platformId = inject(PLATFORM_ID)

  protected readonly backendMode = resolveBackendImpl(environment)

  readonly columns = this.store.columns
  readonly activeId = this.store.activeId
  readonly floating = this.store.floating
  private readonly playing = this.store.playing
  readonly calls = this.recorder.entries

  readonly theme = computed(() => this.themeService.$colorScheme())

  readonly open = signal(this.initialOpen())

  readonly playingLabel = computed(() => {
    const playing = this.playing()
    if (!playing) {
      return '-'
    }
    return `${playing.title} · ep${playing.episode}`
  })

  readonly storeJson = computed(() => {
    const snapshot = {
      columns: this.columns(),
      activeId: this.activeId(),
      playing: this.playing(),
      floating: this.floating(),
      backendMode: this.backendMode,
      theme: this.theme(),
    }
    return JSON.stringify(snapshot, null, 2)
  })

  toggle() {
    this.open.update((value) => !value)
  }

  private initialOpen(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false
    }
    return new URLSearchParams(window.location.search).get('debug') === '1'
  }
}

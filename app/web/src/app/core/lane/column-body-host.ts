import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core'

import type { Column } from './lane.types'

interface ParamRow {
  key: string
  value: string
}

// registry: real body wired in P3. For now every kind renders a labelled
// placeholder panel showing the column params so the shell is fully
// explorable before the feature bodies are adapted.
@Component({
  selector: 'da-column-body-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (col().kind) {
      @default {
        <div
          class="body"
          data-testid="column-body"
          [attr.data-kind]="col().kind"
        >
          <div class="placeholder">
            <div class="kind">{{ col().kind }}</div>
            <div class="note">「{{ col().kind }}」应用占位</div>
            @if (params().length) {
              <dl class="params">
                @for (p of params(); track p.key) {
                  <div class="param">
                    <dt>{{ p.key }}</dt>
                    <dd>{{ p.value }}</dd>
                  </div>
                }
              </dl>
            }
          </div>
        </div>
      }
    }
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .body {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 28px;
    }

    .placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      text-align: center;
      color: var(--p-text-muted);
    }

    .kind {
      font-family: var(--p-mono);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--p-primary-ink);
    }

    .note {
      font-size: 13px;
    }

    .params {
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
      max-width: 320px;
    }

    .param {
      display: flex;
      gap: 10px;
      justify-content: space-between;
      font-size: 12px;
      font-family: var(--p-mono);
      border-top: 1px solid var(--p-divider);
      padding-top: 4px;
    }

    .param dt {
      color: var(--p-text-muted);
    }

    .param dd {
      margin: 0;
      color: var(--p-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 200px;
    }
  `,
})
export class ColumnBodyHost {
  readonly col = input.required<Column>()

  readonly params = computed<ParamRow[]>(() => {
    const col = this.col()
    const rows: ParamRow[] = []
    for (const [key, value] of Object.entries(col)) {
      if (key === 'id' || key === 'kind' || key === 'width' || key === 'full') {
        continue
      }
      if (value == null) {
        continue
      }
      rows.push({ key, value: String(value) })
    }
    return rows
  })
}

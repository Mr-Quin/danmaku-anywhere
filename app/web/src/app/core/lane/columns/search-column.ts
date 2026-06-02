import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core'

import { KazumiSearchPage } from '../../../features/kazumi/pages/kazumi-search-page'
import { LaneStore } from '../lane.store'
import type { Column } from '../lane.types'

@Component({
  selector: 'da-search-column',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KazumiSearchPage],
  host: {
    'data-testid': 'column-body',
    '[attr.data-kind]': 'col().kind',
  },
  template: `
    <da-kazumi-search-page
      [query]="$query()"
      (queryChange)="onQueryChange($event)"
      (openResult)="onOpenResult($event)"
    />
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
  `,
})
export class SearchColumn {
  readonly col = input.required<Column>()

  private readonly store = inject(LaneStore)

  protected readonly $query = computed(() => {
    const col = this.col()
    return col.kind === 'search' ? col.query : undefined
  })

  onQueryChange(query: string) {
    this.store.setSearchQuery(this.col().id, query)
  }

  onOpenResult(result: {
    query?: string
    url: string
    policyName: string
    title?: string
  }) {
    this.store.openWatch({
      title: result.title ?? result.query ?? '',
      url: result.url,
      policyName: result.policyName,
    })
  }
}

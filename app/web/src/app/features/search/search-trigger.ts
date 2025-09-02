import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { ButtonDirective } from 'primeng/button'
import { MaterialIcon } from '../../shared/components/material-icon'
import { SearchService } from './search.service'

@Component({
  selector: 'da-search-trigger',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, MaterialIcon],
  template: `
    <button
      pButton
      type="button"
      severity="secondary"
      text
      rounded
      (click)="open()"
      class="inline-flex items-center gap-2"
      aria-label="搜索 (Ctrl+K)"
    >
      <da-mat-icon icon="search" />
      <span class="max-lg:hidden text-sm opacity-80">Ctrl + K</span>
    </button>
  `,
})
export class SearchTriggerComponent {
  private readonly searchService = inject(SearchService)

  open() {
    this.searchService.open()
  }
}


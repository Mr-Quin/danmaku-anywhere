import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { ButtonDirective } from 'primeng/button'
import { MaterialIcon } from '../../shared/components/material-icon'
import { SearchService } from './search.service'

@Component({
  selector: 'da-search-trigger',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, MaterialIcon],
  template: `
    <div class="">
      <button
        pButton
        type="button"
        severity="secondary"
        text
        (click)="open()"
        class="inline-flex items-center gap-2 w-[280px] h-8 bg-surface-800 hover:bg-surface-700"
      >
        <da-mat-icon icon="search" />
        <span class="max-lg:hidden text-sm opacity-80">Ctrl + K</span>
      </button>
    </div>
  `,
  host: {
    class: 'absolute left-[50%] translate-x-[-50%]',
  },
})
export class SearchTriggerComponent {
  private readonly searchService = inject(SearchService)

  open() {
    this.searchService.open()
  }
}

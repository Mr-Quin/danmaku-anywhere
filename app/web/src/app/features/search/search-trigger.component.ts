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
      (click)="open()"
      class="group inline-flex justify-start gap-2 w-[280px] h-8 bg-surface-800 hover:bg-surface-700"
      >
        <da-mat-icon icon="search" size="lg" class="opacity-60 transition-opacity group-hover:opacity-100" />
        <span class="max-lg:hidden text-sm opacity-60">Ctrl + K</span>
      </button>
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

import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { ButtonDirective } from 'primeng/button'
import { MaterialIcon } from '../../shared/components/material-icon'
import { SearchService } from './search.service'

@Component({
  selector: 'da-search-trigger',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, MaterialIcon],
  template: `
    <div class="flex justify-center px-8">
      <button
        pButton
        type="button"
        severity="secondary"
        text
        (click)="open()"
        class="group inline-flex justify-start gap-2 w-full max-w-[280px] h-8 bg-surface-800 hover:bg-surface-700"
      >
        <da-mat-icon icon="search" size="lg" class="opacity-60 transition-opacity group-hover:opacity-100" />
        <span class="text-sm opacity-60 whitespace-nowrap">Ctrl + K</span>
      </button>
    </div>
  `,
  host: {
    class: 'flex-grow-1',
  },
})
export class SearchTriggerComponent {
  private readonly searchService = inject(SearchService)

  open() {
    this.searchService.open()
  }
}

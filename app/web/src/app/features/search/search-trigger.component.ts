import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { ButtonDirective } from 'primeng/button'
import { SearchService } from './search.service'

@Component({
  selector: 'da-search-trigger',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective],
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
        <i class="pi pi-search text-lg opacity-60 transition-opacity group-hover:opacity-100"></i>
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

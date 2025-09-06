import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  linkedSignal,
  viewChild,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ButtonDirective } from 'primeng/button'
import { Dialog } from 'primeng/dialog'
import { IconField } from 'primeng/iconfield'
import { InputIcon } from 'primeng/inputicon'
import { InputTextModule } from 'primeng/inputtext'
import { MaterialIcon } from '../../shared/components/material-icon'
import { type SearchProvider, SearchService } from './search.service'
import { SearchResultBangumiComponent } from './search-result-bangumi.component'

@Component({
  selector: 'da-search-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Dialog,
    FormsModule,
    InputTextModule,
    MaterialIcon,
    ButtonDirective,
    SearchResultBangumiComponent,
    IconField,
    InputIcon,
  ],
  template: `
    <p-dialog
      #dialog
      [visible]="$visible()"
      (visibleChange)="onVisibleChange($event)"
      draggable="false"
      dismissableMask="true"
      modal="true"
      closable="true"
      closeOnEscape="false"
      blockScroll="false"
      styleClass="top-0"
      contentStyleClass="w-sm md:w-md lg:w-lg"
    >
      <ng-template #headless>
        <div class="flex flex-col p-6 w-[800px] h-[600px] overflow-hidden">
          <form (submit)="$onSubmit($event)" class="flex flex-col">
            <div class="flex items-center gap-2">
              <p-iconfield class="flex-1">
                <p-inputicon class="pi pi-search" />
                <input
                  pInputText
                  type="text"
                  name="term"
                  placeholder="输入搜索关键词"
                  class="w-full"
                  [(ngModel)]="$termLocal"
                  [ngModelOptions]="{ standalone: true }"
                />
                @if ($termLocal().length > 0) {
                  <button type="button" pButton icon="pi pi-times" text severity="secondary" rounded size="small"
                          (click)="$termLocal.set('')" class="absolute right-1 top-1/2 -translate-y-1/2">
                  </button>
                }
              </p-iconfield>
              <button pButton type="submit" [disabled]="!$canSubmit()">
                <da-mat-icon icon="send" />
              </button>
            </div>
          </form>
          <div class="border-b border-surface-700 overflow-hidden flex-shrink-0">
            <button type="button" pButton [text]="true" size="small"
                    [severity]="$provider() === 'bangumi' ? 'primary' : 'secondary'"
                    (click)="setProvider('bangumi')">
              Bangumi
            </button>
            <button type="button" pButton [text]="true" size="small"
                    [severity]="$provider() === 'kazumi' ? 'primary' : 'secondary'"
                    (click)="setProvider('kazumi')">
              Kazumi
            </button>
          </div>
          <div class="overflow-auto">
            @if ($provider() === 'bangumi') {
              <da-search-result-bangumi />
            }
          </div>
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class SearchDialogComponent {
  private readonly searchService = inject(SearchService)

  $dialog = viewChild.required<Dialog>('dialog')
  $visible = this.searchService.$visible
  $provider = this.searchService.$provider
  $termLocal = linkedSignal(() => this.searchService.$term())

  $canSubmit = computed(() => this.$termLocal().trim() !== '')

  close() {
    this.searchService.close()
  }

  onVisibleChange(visible: boolean) {
    if (!visible) {
      this.searchService.close()
    }
  }

  setProvider(provider: SearchProvider) {
    this.$provider.set(provider)
  }

  async $onSubmit(event: Event) {
    event.preventDefault()
    await this.searchService.search(this.$termLocal())
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    const isK = event.key.toLowerCase() === 'k'
    if ((event.ctrlKey || event.metaKey) && isK) {
      event.preventDefault()
      this.searchService.open()
    }

    if (event.key === 'Escape') {
      if (this.$termLocal().length > 0) {
        this.$termLocal.set('')
      } else if (this.$dialog().visible) {
        this.close()
      }
    }
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  effect,
  HostListener,
  inject,
  viewChild,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ButtonDirective } from 'primeng/button'
import { Dialog } from 'primeng/dialog'
import { IconField } from 'primeng/iconfield'
import { InputIcon } from 'primeng/inputicon'
import { InputTextModule } from 'primeng/inputtext'
import { MaterialIcon } from '../../shared/components/material-icon'
import { BangumiSearchFilterComponent } from './bangumi/bangumi-search-filter.component'
import { SearchResultListBangumiComponent } from './bangumi/search-result-list-bangumi.component'
import { SearchHistoryComponent } from './history/search-history.component'
import { SearchService } from './search.service'
import type { SearchProvider } from './search-model.type'

@Component({
  selector: 'da-search-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Dialog,
    FormsModule,
    InputTextModule,
    MaterialIcon,
    ButtonDirective,
    SearchResultListBangumiComponent,
    IconField,
    InputIcon,
    SearchHistoryComponent,
    BangumiSearchFilterComponent,
  ],
  template: `
    <p-dialog
      #dialog
      [visible]="$visible()"
      (visibleChange)="onVisibleChange($event)"
      (onHide)="close()"
      (onShow)="focusInput()"
      styleClass="size-9/10 md:self-start md:mt-[180px] md:w-[800px] md:h-[600px]"
      draggable="false"
      dismissableMask="true"
      modal="true"
      closable="true"
      closeOnEscape="false"
      focusOnShow="true"
      blockScroll="false"
      contentStyleClass="w-sm md:w-md lg:w-lg"
    >
      <ng-template #headless>
        <div class="flex flex-col p-6 overflow-hidden">
          <form (submit)="onSubmit($event)" class="flex flex-col">
            <div class="flex items-center gap-2">
              <p-iconfield class="flex-1">
                <p-inputicon class="pi pi-search" />
                <input
                  #input
                  pInputText
                  type="text"
                  name="term"
                  placeholder="输入搜索关键词"
                  class="w-full"
                  [ngModel]="$term()"
                  (ngModelChange)="handleTermChange($event)"
                  [ngModelOptions]="{ standalone: true }"
                />
                @if ($term().length > 0 || $hasModel()) {
                  <button type="button" pButton icon="pi pi-times" text severity="secondary" rounded size="small"
                          (click)="clearTerm()" class="absolute right-1 top-1/2 -translate-y-1/2">
                  </button>
                }
              </p-iconfield>
              <button pButton type="submit" [disabled]="!$canSubmit()">
                <da-mat-icon icon="send" />
              </button>
            </div>
          </form>
          <div class="border-b border-surface-700 overflow-hidden flex-shrink-0">
            <button type="button" pButton [text]="true"
                    [severity]="$provider() === 'bangumi' ? 'primary' : 'secondary'"
                    (click)="setProvider('bangumi')">
              Bangumi
            </button>
            <button type="button" pButton [text]="true"
                    [severity]="$provider() === 'kazumi' ? 'primary' : 'secondary'"
                    (click)="setProvider('kazumi')">
              Kazumi
            </button>
          </div>
          @if ($provider() === 'bangumi') {
            <div class="m-2">
              <da-bangumi-subject-filter-input />
            </div>
          }
          <div class="overflow-auto">
            @if ($hasModel()) {
              @if ($provider() === 'bangumi') {
              <da-search-result-bangumi />
            } @else {
            }
            }@else {
              <da-search-history />
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
  $input = viewChild<ElementRef<HTMLInputElement>>('input')

  $visible = this.searchService.$visible
  $draft = this.searchService.$draft
  $hasModel = this.searchService.$hasModel

  $provider = computed(() => this.$draft().provider)
  $term = computed(() => this.$draft().term)

  $canSubmit = computed(() => {
    const provider = this.$provider()
    if (provider === 'bangumi') {
      return true
    }
    return this.$term().trim() !== ''
  })

  constructor() {
    effect(() => {
      this.$term()
      this.focusInput()
    })
  }

  close() {
    this.searchService.close()
  }

  focusInput() {
    this.$input()?.nativeElement.focus()
  }

  clearTerm() {
    this.searchService.clear()
    this.searchService.setTerm('')
  }

  handleTermChange(term: string) {
    this.searchService.setTerm(term)
  }

  onVisibleChange(visible: boolean) {
    if (!visible) {
      this.searchService.close()
    }
  }

  setProvider(provider: SearchProvider) {
    this.searchService.setProvider(provider)
  }

  async onSubmit(event: Event) {
    event.preventDefault()
    await this.searchService.search()
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (!this.$dialog().visible) {
      return
    }
    if (event.key === 'Escape') {
      if (this.$term().length > 0 || this.$hasModel()) {
        this.clearTerm()
      } else if (this.$dialog().visible) {
        this.close()
      }
    }
  }
}

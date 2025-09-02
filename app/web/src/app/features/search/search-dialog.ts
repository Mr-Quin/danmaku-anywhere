import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  linkedSignal,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Dialog } from 'primeng/dialog'
import { Button } from 'primeng/button'
import { InputTextModule } from 'primeng/inputtext'
import { MaterialIcon } from '../../shared/components/material-icon'
import { SearchService, type SearchProvider } from './search.service'

@Component({
  selector: 'da-search-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Dialog, Button, FormsModule, InputTextModule, MaterialIcon],
  template: `
    <p-dialog
      [visible]="$visible()"
      (visibleChange)="$onVisibleChange($event)"
      draggable="false"
      dismissableMask="true"
      modal="true"
      contentStyleClass="w-sm md:w-md lg:w-lg"
      maskStyleClass="backdrop-blur-sm"
    >
      <ng-template #header>
        <div class="flex items-center gap-3">
          <da-mat-icon icon="search" />
          <h2 class="text-xl font-bold">搜索</h2>
        </div>
      </ng-template>

      <form (submit)="$onSubmit($event)" class="flex flex-col gap-4">
        <div class="flex items-center gap-2">
          <div class="inline-flex rounded-md border border-surface-700 overflow-hidden">
            <button type="button" pButton [text]="true" [severity]="$provider() === 'kazumi' ? 'primary' : 'secondary'" (click)="$setProvider('kazumi')">
              Kazumi
            </button>
            <button type="button" pButton [text]="true" [severity]="$provider() === 'bangumi' ? 'primary' : 'secondary'" (click)="$setProvider('bangumi')">
              Bangumi
            </button>
          </div>
          <input
            type="text"
            class="flex-1"
            pInputText
            placeholder="输入搜索关键词"
            [(ngModel)]="$termLocal"
            [ngModelOptions]="{ standalone: true }"
          />
          <p-button type="submit" [disabled]="!$canSubmit()">
            <da-mat-icon icon="send" />
          </p-button>
        </div>
      </form>

      <ng-template #footer>
        <div class="flex justify-end">
          <p-button severity="secondary" (click)="$close()">关闭</p-button>
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class SearchDialogComponent {
  private readonly searchService = inject(SearchService)

  $visible = computed(() => this.searchService.$visible())
  $provider = computed(() => this.searchService.$provider())
  $termLocal = linkedSignal(() => this.searchService.$term())

  $close() {
    this.searchService.close()
  }

  $onVisibleChange(visible: boolean) {
    if (!visible) this.searchService.close()
  }

  $setProvider(provider: SearchProvider) {
    this.searchService.setProvider(provider)
  }

  $canSubmit = computed(() => this.$termLocal().trim() !== '')

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
  }
}


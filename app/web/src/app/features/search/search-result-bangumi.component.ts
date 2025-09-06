import { JsonPipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { injectInfiniteQuery } from '@tanstack/angular-query-experimental'
import { InputTextModule } from 'primeng/inputtext'
import { Skeleton } from 'primeng/skeleton'
import { BangumiService } from '../bangumi/services/bangumi.service'
import { SearchService } from './search.service'

@Component({
  selector: 'da-search-result-bangumi',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JsonPipe, FormsModule, InputTextModule, Skeleton],
  template: `
    <div>
      @if (bangumiSearchQuery.isPending()) {
        <p-skeleton styleClass="my-2" width="100%" height="76px" />
      }
      @if (bangumiSearchQuery.isSuccess()) {
        @let data = searchResults();
        @if (data.length === 0) {
          <p>
            无结果
          </p>
        } @else {
          @for (item of data; track item.id) {
            <p>
              {{ item.name }}
            </p>
          }
        }
      }
      @if (bangumiSearchQuery.isError()) {
        <p>
          搜索错误
        </p>
        <p>
          {{ bangumiSearchQuery.error() | json }}
        </p>
      }
    </div>
  `,
})
export class SearchResultBangumiComponent {
  private readonly searchService = inject(SearchService)

  private bangumiService = inject(BangumiService)

  searchResults = computed(() => {
    if (!this.bangumiSearchQuery.isSuccess()) {
      return []
    }
    return this.bangumiSearchQuery.data().pages.flatMap((page) => page.data)
  })

  protected bangumiSearchQuery = injectInfiniteQuery(() => {
    return {
      ...this.bangumiService.searchSubjectsQueryOptions(
        this.searchService.$term()
      ),
      enabled:
        this.searchService.$provider() === 'bangumi' &&
        this.searchService.$term().trim() !== '',
    }
  })
}

import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { injectQuery } from '@tanstack/angular-query-experimental'
import { ShowCard, type ShowCardData } from '../../components/show-card'
import { ShowCardSkeleton } from '../../components/show-card-skeleton'
import { BangumiService } from '../../services/bangumi.service'
import type {
  BgmSlimSubject,
  BgmTrendingSubject,
} from '../../types/bangumi.types'
import type { ShowCardGridItem } from '../calendar/components/show-calendar-grid'

@Component({
  selector: 'da-trending-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ShowCard, ShowCardSkeleton],
  template: `
    <div class="container mx-auto p-4">
      <div class="mb-6">
        <h1 class="text-3xl font-bold mb-2">热门动画</h1>
      </div>

      @if (trendingQuery.isPending()) {
        <div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          @for (item of skeletonItems(); track item.id; ) {
            <da-show-card-skeleton />
          }
        </div>
      } @else if (trendingQuery.isError()) {
        <div class="text-center py-12">
          <p class="text-red-500">加载失败，请稍后重试</p>
        </div>
      } @else if (trendingQuery.isSuccess()) {
        @let data = trendingQuery.data();

        @if (data.length > 0) {
          @let items = transformToItems(data);
          <div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            @for (item of items; track item.id; ) {
              @if (item.isSkeleton) {
                <da-show-card-skeleton />
              } @else if (item.data) {
                <da-show-card [show]="item.data" />
              }
            }
          </div>
        } @else {
          <div class="text-center py-12">
            <p class="text-gray-500">暂无数据</p>
          </div>
        }
      }
    </div>
  `,
})
export class TrendingPage {
  protected bangumiService = inject(BangumiService)

  protected trendingQuery = injectQuery(() => {
    return this.bangumiService.getTrendingQueryOptions()
  })

  protected skeletonItems(): ShowCardGridItem[] {
    return Array.from({ length: 10 }, (_, i) => ({ id: i, isSkeleton: true }))
  }

  protected transformToItems(data: BgmTrendingSubject[]): ShowCardGridItem[] {
    return data.map((item) => ({
      id: item.subject.id,
      data: this.transformToShowCardData(item.subject),
    }))
  }

  protected transformToShowCardData(subject: BgmSlimSubject): ShowCardData {
    return {
      id: subject.id,
      altTitle: subject.name,
      title: subject.nameCN || subject.name,
      rating: subject.rating,
      rank: subject.rating.rank,
      cover: subject.images?.large,
    }
  }
}

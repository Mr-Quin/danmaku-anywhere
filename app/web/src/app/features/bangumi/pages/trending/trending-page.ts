import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  effect,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core'
import { injectInfiniteQuery } from '@tanstack/angular-query-experimental'
import { injectWindowVirtualizer } from '@tanstack/angular-virtual'
import { LayoutService } from '../../../../layout/layout.service'
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
        @let rows = $rows();

        @if (rows.length > 0) {
          <div [style.height.px]="rowVirtualizer.getTotalSize()" class="relative" #container>
            @for (row of rowVirtualizer.getVirtualItems(); track row.index; ) {
              @let items = transformToItems(rows[row.index]);
              <div #virtualItem [attr.data-index]="row.index" class="absolute grid gap-4 w-full"
                   [style.grid-template-columns]="'repeat('+columns()+', minmax(0, 1fr))'"
                   [style.transform]="
                    'translateY(' +
                    (row.start - rowVirtualizer.options().scrollMargin) +
                    'px)'"
              >
                @for (item of items; track item.id; ) {
                  <div>
                    @if (item.isSkeleton) {
                      <da-show-card-skeleton />
                    } @else if (item.data) {
                      <da-show-card [show]="item.data" />
                    }
                  </div>
                }
              </div>
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
  protected layoutService = inject(LayoutService)

  $container = viewChild<ElementRef<HTMLDivElement>>('container')

  protected columns = computed(() => {
    const size = this.layoutService.$screenSize()
    switch (size) {
      case 'xs':
        return 2
      case 'sm':
        return 3
      case 'md':
        return 4
      case 'lg':
        return 6
      case 'xl':
      default:
        return 6
    }
  })

  virtualItems = viewChildren<ElementRef<HTMLDivElement>>('virtualItem')

  rowVirtualizer = injectWindowVirtualizer(() => {
    return {
      count: this.$rows().length,
      estimateSize: () => 400,
      gap: 16,
      scrollMargin: 150,
      laneCount: 6, // not working :(
    }
  })

  #measureItems = effect(() =>
    this.virtualItems().forEach((el) => {
      this.rowVirtualizer.measureElement(el.nativeElement)
    })
  )

  trendingQuery = injectInfiniteQuery(() => {
    return this.bangumiService.getTrendingInfiniteQueryOptions()
  })

  $rows = computed(() => {
    if (!this.trendingQuery.isSuccess()) {
      return []
    }
    const columns = this.columns()

    const data = this.trendingQuery.data().pages.flat()

    if (data.length > 0) {
      const rows = []
      for (let i = 0; i < data.length; i += columns) {
        rows.push(data.slice(i, i + columns))
      }
      return rows
    }

    return []
  })

  private fetchedNext = signal(false)

  private fetchNextPage = effect(() => {
    const lastItem =
      this.rowVirtualizer.getVirtualItems()[
        this.rowVirtualizer.getVirtualItems().length - 1
      ]
    if (!lastItem) {
      return
    }

    if (
      lastItem.index >= this.$rows().length - 1 &&
      this.trendingQuery.hasNextPage() &&
      !this.trendingQuery.isFetchingNextPage() &&
      !this.fetchedNext()
    ) {
      console.log('fetch next page')
      this.trendingQuery.fetchNextPage().then(() => {
        this.fetchedNext.set(false)
      })
      // for some reason isFetchingNextPage is not immediately set to true after calling fetch,
      // resulting in duplicate calls, so we keep a separate flag for that state
      this.fetchedNext.set(true)
    }
  })

  protected skeletonItems(): ShowCardGridItem[] {
    return Array.from({ length: 20 }, (_, i) => ({ id: i, isSkeleton: true }))
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

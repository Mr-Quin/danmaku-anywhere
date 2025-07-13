import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { injectQuery } from '@tanstack/angular-query-experimental'
import { BangumiService } from '../../services/bangumi.service'
import type { BgmCalendar } from '../../types/bangumi.types'
import { transformToShowCardData } from '../../utils/transform-to-show-card-data'
import {
  ShowCalendarGrid,
  type ShowCardGridItem,
} from './components/show-calendar-grid'

@Component({
  selector: 'da-calendar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ShowCalendarGrid],
  template: `
    <div class="container mx-auto p-4">
      <div class="mb-6">
        <h1 class="text-3xl font-bold mb-2">放送日历</h1>
      </div>

      @if (calendarQuery.isPending()) {
        <da-show-calendar-grid
          [weekdays]="skeletonWeekdays()"
        />
      } @else if (calendarQuery.isError()) {
        <div class="text-center py-12">
          <p class="text-red-500">加载失败，请稍后重试</p>
        </div>
      } @else if (calendarQuery.isSuccess()) {
        @let weeks = calendarQuery.data();

        @if (weeks) {
          <da-show-calendar-grid
            [weekdays]="transformToWeekdays(weeks)"
          />
        } @else {
          <div class="text-center py-12">
            <p class="text-gray-500">暂无数据</p>
          </div>
        }
      }
    </div>
  `,
})
export class CalendarPage {
  protected bangumiService = inject(BangumiService)
  protected calendarQuery = injectQuery(() => {
    return this.bangumiService.getCalendarQueryOptions()
  })

  protected skeletonWeekdays(): ShowCardGridItem[][] {
    return Array.from({ length: 7 }, () =>
      Array.from({ length: 3 }, (_, i) => ({ id: i, isSkeleton: true }))
    )
  }

  protected transformToWeekdays(weeks: BgmCalendar): ShowCardGridItem[][] {
    return weeks.map((week) =>
      week.map((show) => ({
        id: show.subject.id,
        data: transformToShowCardData(show.subject),
      }))
    )
  }
}

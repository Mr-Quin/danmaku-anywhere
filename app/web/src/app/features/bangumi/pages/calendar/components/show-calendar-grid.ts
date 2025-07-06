import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
} from '@angular/core'
import { TabPanel, TabView } from 'primeng/tabview'
import { ShowCard, type ShowCardData } from '../../../components/show-card'
import { ShowCardSkeleton } from '../../../components/show-card-skeleton'

export interface ShowCardGridItem {
  id: number
  data?: ShowCardData
  isSkeleton?: boolean
}

@Component({
  selector: 'da-show-calendar-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TabView, TabPanel, ShowCard, ShowCardSkeleton],
  template: `
    <div class="hidden xl:block">
      <div class="grid grid-cols-7 gap-6">
        @for (weekday of weekdays(); track $index) {
          @if (weekday.length > 0) {
            <div>
              <h3 class="text-2xl mb-4">
                {{ WEEKDAYS[$index] }}
              </h3>
              <div class="space-y-3">
                @for (item of weekday; track item.id; ) {
                  @if (item.isSkeleton) {
                    <da-show-card-skeleton hideFooter hideAltTitle />
                  } @else if (item.data) {
                    <da-show-card [show]="item.data" hideFooter hideAltTitle />
                  }
                }
              </div>
            </div>
          }
        }
      </div>
    </div>

    <div class="xl:hidden">
      <p-tabView
        [activeIndex]="activeTabIndex()"
        (onChange)="activeTabIndex.set($event.index)"
        styleClass="calendar-tabs">
        @for (weekday of weekdays(); track $index) {
          @if (weekday.length > 0) {
            <p-tabPanel
              [header]="getTabHeader(WEEKDAYS[$index], weekday.length)"
              [closable]="false">
              <div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                @for (item of weekday; track item.id; ) {
                  @if (item.isSkeleton) {
                    <da-show-card-skeleton hideFooter hideAltTitle />
                  } @else if (item.data) {
                    <da-show-card [show]="item.data" hideFooter hideAltTitle />
                  }
                }
              </div>
            </p-tabPanel>
          }
        }
      </p-tabView>
    </div>

  `,
})
export class ShowCalendarGrid {
  weekdays = input<ShowCardGridItem[][]>([])
  protected activeTabIndex = signal(0)

  protected WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

  protected getTabHeader(weekday: string, count: number): string {
    return `${weekday} (${count})`
  }
}

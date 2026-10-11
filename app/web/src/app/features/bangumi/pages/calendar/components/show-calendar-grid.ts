import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core'
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs'
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
  imports: [
    CommonModule,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    ShowCard,
    ShowCardSkeleton,
  ],
  template: `
    <div class="wide">
      <div class="week-columns">
        @for (weekday of weekdays(); track $index) {
          @if (weekday.length > 0) {
            <div>
              @let isToday = getTodayIndex() === $index;
              <h3 class="text-xl px-2 mb-3" [class.text-primary]="isToday">
                {{ WEEKDAYS[$index] }}
              </h3>
              <div class="space-y-3 p-2 rounded" [class.bg-primary]="isToday">
                @for (item of weekday; track item.id; ) {
                  @if (item.isSkeleton) {
                    <da-show-card-skeleton hideFooter hideAltTitle />
                  } @else if (item.data) {
                    <da-show-card
                      [show]="item.data"
                      hideFooter
                      hideAltTitle
                      (detailsClick)="openDetails.emit(item.data)"
                      (watchClick)="openWatch.emit($event)"
                    />
                  }
                }
              </div>
            </div>
          }
        }
      </div>
    </div>

    <div class="narrow">
      <p-tabs
        [(value)]="activeTabValue"
        styleClass="calendar-tabs">
        <p-tablist>
          @for (weekday of weekdays(); track $index) {
            @if (weekday.length > 0) {
              <p-tab [value]="$index">
                {{ getTabHeader(WEEKDAYS[$index], weekday.length) }}
              </p-tab>
            }
          }
        </p-tablist>

        <p-tabpanels>
          @for (weekday of weekdays(); track $index) {
            @if (weekday.length > 0) {
              <p-tabpanel [value]="$index">
                <div class="day-grid">
                  @for (item of weekday; track item.id; ) {
                    @if (item.isSkeleton) {
                      <da-show-card-skeleton hideFooter hideAltTitle />
                    } @else if (item.data) {
                      <da-show-card
                        [show]="item.data"
                        hideFooter
                        hideAltTitle
                        (detailsClick)="openDetails.emit(item.data)"
                        (watchClick)="openWatch.emit($event)"
                      />
                    }
                  }
                </div>
              </p-tabpanel>
            }
          }
        </p-tabpanels>
      </p-tabs>
    </div>
  `,
  styles: `
    .wide {
      display: none;
    }

    .narrow {
      display: block;
    }

    .week-columns {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 0.5rem;
    }

    .day-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 1rem;
    }

    @container (min-width: 1100px) {
      .wide {
        display: block;
      }

      .narrow {
        display: none;
      }
    }
  `,
})
export class ShowCalendarGrid {
  weekdays = input<ShowCardGridItem[][]>([])
  readonly openDetails = output<ShowCardData>()
  readonly openWatch = output<ShowCardData>()
  protected activeTabValue = signal(this.getTodayIndex())

  protected WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

  protected getTabHeader(weekday: string, count: number): string {
    return `${weekday} (${count})`
  }

  protected getTodayIndex(): number {
    const today = new Date()
    const dayOfWeek = today.getDay()
    // Convert Sunday (0) to 6, Monday (1) to 0, etc.
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1
  }
}

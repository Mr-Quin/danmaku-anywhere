import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, input } from '@angular/core'

@Component({
  selector: 'da-rating-distribution',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="flex items-end gap-1 h-full">
      @for (item of getDistributionData(); track item.score) {
        <div class="flex flex-col items-center justify-end h-full">
          <div
            class="text-primary bg-primary w-2"
            [style.height.%]="item.percentage"
            [style.min-height.px]="item.count > 0 ? 2 : 0"
            [title]="item.score + '分: ' + item.count"
          ></div>
          <span class="text-[0.6rem] leading-[0.25rem] text-gray-500 mt-0.5">{{ item.score }}</span>
        </div>
      }
    </div>
  `,
})
export class RatingDistributionComponent {
  ratingCounts = input.required<number[]>()
  total = input.required<number>()

  protected getDistributionData() {
    const counts = this.ratingCounts()
    const total = this.total()
    return counts.map((count, i) => ({
      score: i + 1,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }))
  }
}

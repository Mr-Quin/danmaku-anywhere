import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { MaterialIcon } from './material-icon'

@Component({
  selector: 'da-star-rating',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MaterialIcon],
  template: `
    <div class="flex items-center gap-1">
      @for (star of getStars(); track $index) {
        <da-mat-icon
          [icon]="star.icon"
          [class]="star.color"
          [filled]="star.filled"
          size="lg"
        />
      }
    </div>
  `,
})
export class StarRatingComponent {
  rating = input.required<number>()
  maxRating = input<number>(10)

  protected getStars() {
    const rating = this.rating()
    const maxRating = this.maxRating()
    const normalizedRating = (rating / maxRating) * 5
    const fullStars = Math.floor(normalizedRating)
    const hasHalfStar = normalizedRating % 1 >= 0.5
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

    const stars = []

    for (let i = 0; i < fullStars; i++) {
      stars.push({ icon: 'star', filled: true, color: 'text-yellow-500' })
    }

    if (hasHalfStar) {
      stars.push({ icon: 'star_half', filled: true, color: 'text-yellow-500' })
    }

    for (let i = 0; i < emptyStars; i++) {
      stars.push({
        icon: 'star_outline',
        filled: false,
        color: 'text-gray-300',
      })
    }

    return stars
  }
}

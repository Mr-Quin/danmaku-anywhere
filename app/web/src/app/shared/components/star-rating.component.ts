import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, input } from '@angular/core'

interface Star {
  icon: string
  color: string
}

@Component({
  selector: 'da-star-rating',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-1">
      @for (star of getStars(); track $index) {
        <i class="pi text-lg {{ star.icon }} {{ star.color }}"></i>
      }
    </div>
  `,
})
export class StarRatingComponent {
  rating = input.required<number>()
  maxRating = input<number>(10)

  protected getStars(): Star[] {
    const rating = this.rating()
    const maxRating = this.maxRating()
    const normalizedRating = (rating / maxRating) * 5
    const fullStars = Math.floor(normalizedRating)
    const hasHalfStar = normalizedRating % 1 >= 0.5
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

    const stars: Star[] = []

    for (let i = 0; i < fullStars; i++) {
      stars.push({ icon: 'pi-star-fill', color: 'text-yellow-500' })
    }

    if (hasHalfStar) {
      stars.push({ icon: 'pi-star-fill', color: 'text-yellow-500' })
    }

    for (let i = 0; i < emptyStars; i++) {
      stars.push({ icon: 'pi-star', color: 'text-gray-300' })
    }

    return stars
  }
}

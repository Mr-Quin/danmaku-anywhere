import { CommonModule } from '@angular/common'
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core'
import { Card } from 'primeng/card'
import { Skeleton } from 'primeng/skeleton'

@Component({
  selector: 'da-show-card-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, Card, Skeleton],
  template: `
    <p-card styleClass="overflow-hidden">
      <ng-template #header>
        <div class="relative aspect-square md:aspect-[2/3]">
          <p-skeleton width="100%" height="100%" />
        </div>
      </ng-template>

      <ng-template #content>
        <div class="flex flex-col">
          <p-skeleton width="80%" height="24px" />
          @if (!hideAltTitle()) {
            <p-skeleton width="60%" height="16px" class="mt-2" />
          }
        </div>
      </ng-template>

      @if (!hideFooter()) {
        <ng-template #footer>
          <div class="flex justify-between">
            <p-skeleton width="60px" height="32px" />
            <p-skeleton width="60px" height="32px" />
          </div>
        </ng-template>
      }
    </p-card>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
  `,
})
export class ShowCardSkeleton {
  hideAltTitle = input(false, { transform: booleanAttribute })
  hideFooter = input(false, { transform: booleanAttribute })
}

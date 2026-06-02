import { CommonModule, NgOptimizedImage } from '@angular/common'
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core'
import { Button } from 'primeng/button'
import { Card } from 'primeng/card'
import { Tag } from 'primeng/tag'
import { TrackingService } from '../../../core/tracking.service'
import { MaterialIcon } from '../../../shared/components/material-icon'
import { IMAGE_PLACEHOLDER_DATA } from '../../../shared/placeholder-data'

export interface ShowCardData {
  id: number
  altTitle: string
  title?: string
  air_date?: string
  eps?: number
  eps_count?: number
  rating?: {
    score?: number
    total?: number
  }
  rank?: number
  cover?: string
}

@Component({
  selector: 'da-show-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, Card, Button, Tag, MaterialIcon, NgOptimizedImage],
  host: {
    'data-testid': 'show-card',
    '[attr.data-subject-id]': 'show().id',
  },
  template: `
    <p-card styleClass="overflow-hidden">
      @let showData = show();
      <ng-template #header>
        <div class="relative aspect-[17/24] contain-strict overflow-hidden">
          <img
            [ngSrc]="showData.cover ?? ''"
            [alt]="showData.altTitle"
            class="object-cover cursor-pointer hover:opacity-80 transition-opacity"
            width="340"
            height="480"
            (click)="emitDetails(showData.id, 'image')" />
          @if (showData.rating?.score !== undefined) {
            <div class="absolute top-2 right-2">
              <p-tag
                [value]="showData.rating!.score!.toFixed(1)"
                severity="secondary"
                class="font-bold"
              />
            </div>
          }
          @if (showData.rank && showData.rank > 0) {
            <div class="absolute top-2 left-2">
              <p-tag
                [value]="'#' + showData.rank"
                severity="info"
                class="font-bold bg-cyan-950"
              />
            </div>
          }
        </div>
      </ng-template>

      <ng-template #content>
        <div class="space-y-1">
          <h3
            class="text-lg font-semibold overflow-hidden text-nowrap text-ellipsis cursor-pointer hover:underline"
            (click)="emitDetails(showData.id, 'title')"
            [title]="showData.title">
            {{ showData.title }}
          </h3>
          @if (!hideAltTitle() && showData.title && showData.altTitle !== showData.title) {
            <p class="text-sm text-gray-600 overflow-hidden text-nowrap text-ellipsis">
              {{ showData.altTitle }}
            </p>
          }
        </div>
      </ng-template>

      @if (!hideFooter()) {
        <ng-template #footer>
          <div class="flex justify-between">
            <p-button
              (click)="emitDetails(showData.id, 'detailsButton')"
              label="详情"
              severity="secondary"
              size="small"
            />
            <p-button
              label="观看"
              severity="primary"
              size="small"
              (click)="emitWatch(showData)"
            >
              <ng-template #icon>
                <da-mat-icon size="sm" icon="play_arrow" />
              </ng-template>
            </p-button>
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
export class ShowCard {
  readonly show = input.required<ShowCardData>()
  readonly hideAltTitle = input(false, { transform: booleanAttribute })
  readonly hideFooter = input(false, { transform: booleanAttribute })

  readonly detailsClick = output<number>()
  readonly watchClick = output<ShowCardData>()

  private trackingService = inject(TrackingService)

  emitDetails(id: number, source: string): void {
    this.trackingService.track('clickShowCard', { id, source })
    this.detailsClick.emit(id)
  }

  emitWatch(showData: ShowCardData): void {
    this.trackingService.track('clickShowCardWatch', { showData })
    this.watchClick.emit(showData)
  }

  protected readonly IMAGE_PLACEHOLDER_DATA = IMAGE_PLACEHOLDER_DATA
}

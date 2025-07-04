import { CommonModule, NgOptimizedImage } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { Button } from 'primeng/button'
import { Card } from 'primeng/card'
import { Tag } from 'primeng/tag'
import { MaterialIcon } from '../../../shared/components/material-icon'

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
  imports: [
    CommonModule,
    RouterLink,
    Card,
    Button,
    Tag,
    MaterialIcon,
    NgOptimizedImage,
  ],
  template: `
    <p-card styleClass="overflow-hidden">
      @let showData = show();
      <ng-template #header>
        <div class="relative aspect-[2/3]">
          <img
            [ngSrc]="showData.cover ?? ''"
            [alt]="showData.altTitle"
            class="object-cover cursor-pointer hover:opacity-80 transition-opacity"
            priority
            fill
            (click)="navigateToDetails(showData.id)" />
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
            (click)="navigateToDetails(showData.id)"
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

      <ng-template #footer>
        <div class="flex justify-between">
          <p-button
            [routerLink]="['/details', showData.id]"
            label="详情"
            severity="secondary"
            size="small"
          />
          <p-button
            [routerLink]="['/kazumi/search']"
            [queryParams]="{ q: showData.title || showData.altTitle, id: showData.id, type: 'bangumi' }"
            label="观看"
            severity="primary"
            size="small"
          >
            <ng-template #icon>
              <da-mat-icon size="small" icon="play_arrow" />
            </ng-template>
          </p-button>
        </div>
      </ng-template>
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
  show = input.required<ShowCardData>()
  hideAltTitle = input<boolean>(false)

  private router = inject(Router)

  navigateToDetails(id: number): void {
    void this.router.navigate(['/details', id])
  }
}

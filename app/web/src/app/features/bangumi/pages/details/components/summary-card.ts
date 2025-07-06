import { CommonModule } from '@angular/common'
import type { AfterViewInit, ElementRef } from '@angular/core'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
  viewChild,
} from '@angular/core'
import { Button } from 'primeng/button'
import { Card } from 'primeng/card'
import { MaterialIcon } from '../../../../../shared/components/material-icon'

@Component({
  selector: 'da-summary-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, Card, Button, MaterialIcon],
  template: `
    @if (summary()) {
      <div class="mb-6">
        <p-card>
          <div class="flex items-center justify-between mb-3 cursor-pointer" (click)="toggleSummaryExpanded()"
          >
            <h3 class="text-lg font-semibold">简介</h3>
            @if (needsExpansion()) {
              <p-button
                text
                rounded
                severity="secondary"
                size="small"
              >
                <ng-template #icon>
                  <da-mat-icon
                    [icon]="summaryExpanded() ? 'expand_less' : 'expand_more'"
                    size="lg"
                  />
                </ng-template>
              </p-button>
            }
          </div>
          <div
            #summaryElement
            class="relative overflow-hidden transition-all duration-300 ease-in-out"
            [style.max-height.px]="maxHeight()"
          >
            <p class="whitespace-pre-line">{{ summary() }}</p>
            @if (needsExpansion() && !summaryExpanded()) {
              <div
                class="absolute bottom-0 left-0 right-0 h-8 cursor-pointer"
                (click)="toggleSummaryExpanded()"
                style="background: linear-gradient(to top, var(--p-card-background) 0%, var(--p-card-background) 0%, transparent 100%);">
              </div>
            }
          </div>
        </p-card>
      </div>
    }
  `,
})
export class SummaryCard implements AfterViewInit {
  private readonly previewHeight = 96

  summary = input<string>('')

  protected summaryExpanded = signal(false)

  protected maxHeight = signal<number>(this.previewHeight)
  protected fullHeight = signal<number>(0)

  private summaryElement =
    viewChild<ElementRef<HTMLDivElement>>('summaryElement')

  protected needsExpansion = computed(() => {
    return this.fullHeight() > this.previewHeight
  })

  constructor() {
    effect(() => {
      const expanded = this.summaryExpanded()
      const full = this.fullHeight()

      if (expanded) {
        this.maxHeight.set(full)
      } else {
        this.maxHeight.set(this.previewHeight)
      }
    })
  }

  ngAfterViewInit(): void {
    this.measureElementHeight()
  }

  protected toggleSummaryExpanded() {
    this.summaryExpanded.update((expanded) => !expanded)
  }

  private measureElementHeight() {
    const element = this.summaryElement()?.nativeElement
    if (!element) return

    const fullHeight = element.scrollHeight
    this.fullHeight.set(fullHeight)
  }
}

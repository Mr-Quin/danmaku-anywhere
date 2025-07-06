import { CommonModule, NgOptimizedImage } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core'
import { injectQuery } from '@tanstack/angular-query-experimental'
import { Card } from 'primeng/card'
import { ProgressSpinner } from 'primeng/progressspinner'
import { Tag } from 'primeng/tag'
import { BangumiService } from '../services/bangumi.service'

@Component({
  selector: 'da-staff-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ProgressSpinner, Card, Tag, NgOptimizedImage],
  template: `
    @if (staffQuery.isPending()) {
      <div class="flex justify-center py-8">
        <p-progress-spinner />
      </div>
    } @else if (staffQuery.isSuccess()) {
      @let response = staffQuery.data();
      @if (response?.data && response.data.length > 0) {
        <div class="grid grid-cols-2 gap-4">
          @for (staffMember of response.data; track staffMember.staff.id) {
            <div class="flex gap-4">
              @if (staffMember.staff.images?.medium) {
                <img
                  [ngSrc]="staffMember.staff.images!.medium!"
                  [width]="64"
                  [height]="64"
                  [alt]="staffMember.staff.name"
                  class="w-24 h-24 object-cover rounded"
                />
              } @else {
                <div class="w-24 h-24 bg-surface-800 rounded"></div>
              }
              <div class="flex-1">
                <h4 class="font-semibold">{{ staffMember.staff.nameCN || staffMember.staff.name }}</h4>
                @if (staffMember.staff.nameCN && staffMember.staff.name !== staffMember.staff.nameCN) {
                  <p class="text-sm text-gray-600">{{ staffMember.staff.name }}</p>
                }
                @if (staffMember.positions && staffMember.positions.length > 0) {
                  <div class="mt-2 flex gap-2 flex-wrap">
                    @for (position of staffMember.positions; track position.type.id) {
                      <p-tag
                        [value]="position.type.cn"
                        severity="info"
                        styleClass="bg-blue-100 text-blue-800 text-xs font-normal"
                        size="small"
                      />
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>
      } @else {
        <p-card>
          <p class="text-gray-500">暂无制作人员信息</p>
        </p-card>
      }
    } @else {
      <p-card>
        <p class="text-red-500">加载制作人员信息失败</p>
      </p-card>
    }
  `,
})
export class StaffTab {
  subjectId = input.required<number>()
  visited = input<boolean>(false)

  private bangumiService = inject(BangumiService)

  protected staffQuery = injectQuery(() => {
    return {
      ...this.bangumiService.getSubjectStaffPersonsQueryOptions(
        this.subjectId()
      ),
      enabled: this.visited(),
    }
  })
}

import {
  CdkDrag,
  type CdkDragDrop,
  CdkDragHandle,
  CdkDragPlaceholder,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop'
import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import type { KazumiPolicy } from '@danmaku-anywhere/danmaku-provider/kazumi'
import { Button } from 'primeng/button'
import { Tag } from 'primeng/tag'
import { MaterialIcon } from '../../../shared/components/material-icon'
import { KazumiService } from '../services/kazumi.service'

@Component({
  selector: 'da-kazumi-policy-manage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    Button,
    Tag,
    CdkDropList,
    CdkDrag,
    MaterialIcon,
    CdkDragHandle,
    CdkDragPlaceholder,
  ],
  styles: [
    `
        .cdk-drop-list-dragging .cdk-drag {
            transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
        }
        .cdk-drag-animating {
            transition: transform 300ms cubic-bezier(0, 0, 0.2, 1);
        }
    `,
  ],
  template: `
    @if (kazumiService.localPoliciesQuery.isPending()) {
      <div class="flex justify-center items-center p-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>
    } @else if (kazumiService.localPoliciesQuery.isError()) {
      <div class="alert alert-error">
        <p>{{ kazumiService.localPoliciesQuery.error().message }}</p>
      </div>
    } @else if (kazumiService.localPoliciesQuery.isSuccess()) {
      @let data = kazumiService.localPoliciesQuery.data();
      @if (data.length === 0) {
        <div class="text-center space-y-4 p-8">
          <div>
            <h3 class="text-lg font-medium mb-2">暂无规则</h3>
            <p class="text-surface-600 mb-4">您还没有安装任何 Kazumi 规则。</p>
          </div>
        </div>
      } @else {
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">已安装的规则 ({{ kazumiService.localPoliciesQuery.data().length }})</h3>
          </div>

          <ul class="space-y-2"
              [class.opacity-50]="kazumiService.localPoliciesQuery.isPending() || kazumiService.updatePolicyOrderMutation.isPending()"
              cdkDropList
              (cdkDropListDropped)="onDrop($event)">
            @for (policy of kazumiService.localPoliciesQuery.data(); track policy.name; ) {
              @let importing = kazumiService.$inProgressImports().has(policy.name);
              @let hasNew = hasNewVersion(policy);
              <li class="p-4 border border-surface-200 dark:border-surface-700 rounded-lg flex gap-3" cdkDrag
                  [cdkDragDisabled]="$count === 1">
                @if ($count > 1) {
                  <da-mat-icon icon="reorder" class="cursor-pointer self-center" cdkDragHandle size="2xl" />
                }
                <div class="h-[78px]" *cdkDragPlaceholder></div>
                <div class="flex justify-between items-center grow-1">
                  <div class="flex gap-2 items-start">
                    <div>
                      <div class="font-medium">{{ policy.name }}</div>
                      <div class="text-sm text-surface-600">版本 {{ policy.version }}</div>
                    </div>
                    @if (hasNew) {
                      <p-tag severity="warn" value="新版本" />
                    }
                  </div>
                  <div class="flex gap-2">
                    <p-button
                      severity="secondary"
                      (click)="kazumiService.deletePolicyMutation.mutate(policy.name)"
                      [disabled]="importing"
                      size="small"
                    >
                      删除
                    </p-button>
                    @if (hasNew) {
                      <p-button
                        severity="primary"
                        (click)="kazumiService.addPolicyMutation.mutate(policy.name)"
                        [loading]="importing"
                        size="small"
                      >
                        更新
                      </p-button>
                    }
                  </div>
                </div>
              </li>
            }
          </ul>
        </div>
      }
    }
  `,
})
export class KazumiPolicyManage {
  protected kazumiService = inject(KazumiService)

  protected hasNewVersion(policy: KazumiPolicy) {
    if (!this.kazumiService.manifestsQuery.isSuccess()) return false
    const manifest = this.kazumiService.manifestsQuery
      .data()
      .find((m) => policy.name === m.name)

    if (!manifest) return false

    return manifest.version !== policy.version
  }

  protected async onDrop(event: CdkDragDrop<string[]>) {
    const prev = this.kazumiService.orderQuery.data()
    if (prev) {
      const nextOrder = [...prev]
      moveItemInArray(nextOrder, event.previousIndex, event.currentIndex)
      this.kazumiService.updatePolicyOrderMutation.mutate(nextOrder)
    }
  }
}

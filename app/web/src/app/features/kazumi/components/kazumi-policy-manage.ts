import {
  CdkDrag,
  type CdkDragDrop,
  CdkDragHandle,
  CdkDragPlaceholder,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop'
import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from '@angular/core'
import type { KazumiPolicy } from '@danmaku-anywhere/danmaku-provider/kazumi'
import { Button } from 'primeng/button'
import { Divider } from 'primeng/divider'
import { Tag } from 'primeng/tag'
import { MaterialIcon } from '../../../shared/components/material-icon'
import { KazumiService } from '../services/kazumi.service'

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'da-kazumi-policy-manage',
  imports: [
    CommonModule,
    Button,
    Divider,
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
    <div class="max-w-2xl w-2xl">
      <div class="flex mb-6">
        <p-button class="ml-auto" (click)="openImport.emit()">
          导入规则
        </p-button>
      </div>

      <ul class="w-full"
          [class.opacity-50]="kazumiService.localPoliciesQuery.isPending() || kazumiService.updatePolicyOrderMutation.isPending()"
          cdkDropList
          (cdkDropListDropped)="onDrop($event)">
        @for (policy of kazumiService.localPoliciesQuery.data(); track policy.name) {
          @let importing = kazumiService.$inProgressImports().has(policy.name);
          @let hasNew = hasNewVersion(policy);
          <li class="p-4 flex gap-2" cdkDrag [cdkDragDisabled]="$count === 1">
            @if ($count > 1) {
              <da-mat-icon icon="reorder" class="cursor-pointer self-center" cdkDragHandle styleClass="text-2xl" />
            }
            <div class="h-[76px]" *cdkDragPlaceholder></div>
            <div class="flex justify-between items-center grow-1">
              <div class="flex gap-2 items-start">
                <div>
                  <div class="font-medium">{{ policy.name }}</div>
                  <div class="text-sm text-gray-500">{{ policy.version }}</div>
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
                >
                  删除
                </p-button>
                @if (hasNew) {
                  <p-button
                    severity="primary"
                    (click)="kazumiService.addPolicyMutation.mutate(policy.name)"
                    [loading]="importing"
                  >
                    更新
                  </p-button>
                }
              </div>
            </div>
          </li>

          @if (!$last) {
            <p-divider></p-divider>
          }
        }
      </ul>

    </div>
  `,
})
export class KazumiPolicyManage {
  openImport = output()

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

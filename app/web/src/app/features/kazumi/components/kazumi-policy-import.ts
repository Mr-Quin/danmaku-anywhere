import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Button } from 'primeng/button'
import { IconField } from 'primeng/iconfield'
import { InputTextModule } from 'primeng/inputtext'
import { MaterialIcon } from '../../../shared/components/material-icon'
import { KazumiService } from '../services/kazumi.service'

@Component({
  selector: 'da-kazumi-policy-import',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    Button,
    FormsModule,
    InputTextModule,
    IconField,
    MaterialIcon,
  ],
  template: `
    <div class="space-y-4">
      <div class="flex items-center gap-4">
        <p-iconfield iconPosition="left" class="flex-1">
          <input
            type="text"
            pInputText
            placeholder="搜索规则..."
            [(ngModel)]="filter"
            class="w-full"
          />
        </p-iconfield>
        <p-button
          severity="secondary"
          text
          rounded
          (click)="refreshManifests()"
          [loading]="kazumiService.manifestsQuery.isPending()"
        >
          <da-mat-icon icon="refresh" size="xl" />
        </p-button>
      </div>

      @if (kazumiService.manifestsQuery.isPending()) {
        <div class="flex justify-center items-center p-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      } @else if (kazumiService.manifestsQuery.isError()) {
        <div class="alert alert-error">
          <p>{{ kazumiService.manifestsQuery.error().message }}</p>
        </div>
      } @else if (kazumiService.manifestsQuery.isSuccess()) {
        @let data = kazumiService.manifestsQuery.data();
        @if (data.length === 0) {
          <div class="text-center space-y-4 p-8">
            <div>
              <h3 class="text-lg font-medium mb-2">未找到规则</h3>
              <p class="text-surface-600 mb-4">仓库中没有可用的规则。</p>
            </div>
          </div>
        } @else {
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">
                可用规则 ({{ filteredManifests().length }}/{{ data.length }})
              </h3>
            </div>

            <div class="grid gap-3">
              @for (manifest of filteredManifests(); track manifest.name) {
                @let isImported = isPolicyImported(manifest.name);
                @let isImporting = kazumiService.$inProgressImports().has(manifest.name);
                <div
                  class="p-4 border border-surface-200 dark:border-surface-700 rounded-lg flex justify-between items-center">
                  <div class="flex gap-3 items-start">
                    <div>
                      <div class="font-medium">{{ manifest.name }}</div>
                      <div class="text-sm text-surface-600">版本 {{ manifest.version }}</div>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    @if (isImported) {
                      <p-button
                        severity="secondary"
                        disabled
                        size="small"
                      >
                        <da-mat-icon icon="check" />
                        已导入
                      </p-button>
                    } @else {
                      <p-button
                        severity="primary"
                        (click)="kazumiService.addPolicyMutation.mutate(manifest.name)"
                        [loading]="isImporting"
                        size="small"
                      >
                        <da-mat-icon icon="download" />
                        导入
                      </p-button>
                    }
                  </div>
                </div>
              }
            </div>

            @if (filteredManifests().length === 0 && filter()) {
              <div class="text-center space-y-4 p-8">
                <div>
                  <h3 class="text-lg font-medium mb-2">未找到匹配的规则</h3>
                  <p class="text-surface-600 mb-4">尝试使用不同的搜索关键词。</p>
                  <p-button
                    severity="secondary"
                    (click)="filter.set('')"
                  >
                    清除搜索
                  </p-button>
                </div>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
})
export class KazumiPolicyImport {
  protected kazumiService = inject(KazumiService)

  protected filter = signal('')

  protected filteredManifests = computed(() => {
    const manifests = this.kazumiService.manifestsQuery.data()
    if (!manifests) return []

    return manifests.filter((m) => {
      return m.name
        .toLocaleLowerCase()
        .includes(this.filter().toLocaleLowerCase())
    })
  })

  protected isPolicyImported(name: string): boolean {
    if (this.kazumiService.localPoliciesQuery.isSuccess()) {
      return this.kazumiService.localPoliciesQuery
        .data()
        .some((policy) => policy.name === name)
    }
    return false
  }

  protected refreshManifests() {
    void this.kazumiService.manifestsQuery.refetch()
  }
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { Button } from 'primeng/button'
import { Card } from 'primeng/card'
import { UpdateService } from '../../core/update/update.service'

@Component({
  selector: 'da-update-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Card],
  template: `
    @if (updateService.$showUpdateBanner()) {
      <div class="fixed bottom-10 right-4">
        <p-card>
            <p class="text-sm mb-2">
            发现新版本
            </p>
          <div class="flex items-center gap-2">
            <p-button
              label="立即更新"
              (click)="updateService.activateUpdate()"
              size="small"
            />
          </div>
        </p-card>
      </div>
    }
  `,
})
export class UpdateBanner {
  protected updateService = inject(UpdateService)
}

import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core'
import { Button } from 'primeng/button'
import { Dialog } from 'primeng/dialog'
import { Divider } from 'primeng/divider'

@Component({
  selector: 'da-privacy-policy-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Dialog, Button, Divider],
  template: `
    <p-dialog [visible]="visible()"
              (visibleChange)="visibleChange.emit($event)"
              draggable="false"
              dismissableMask="true"
              modal="true"
              contentStyleClass="w-sm md:w-md lg:w-lg xl:w-xl"
              maskStyleClass="backdrop-blur-sm">
      <ng-template #header>
        <h2 class="text-xl font-bold">隐私政策</h2>
      </ng-template>

      <div class="space-y-4">
        <section>
          <h3 class="text-lg font-semibold mb-2">信息收集</h3>
          <p class="text-sm">
            本应用使用 Microsoft Clarity 以及 New Relic 来收集匿名的使用数据，以改善用户体验。
            收集的数据包括页面浏览、点击行为和用户交互模式。
          </p>
        </section>

        <p-divider />

        <section>
          <h3 class="text-lg font-semibold mb-2">数据使用</h3>
          <p class="text-sm">
            收集的数据仅用于：
          </p>
          <ul class="text-sm mt-2 space-y-1">
            <li>• 分析用户行为和应用性能</li>
            <li>• 改善用户界面和用户体验</li>
            <li>• 识别和修复应用中的问题</li>
          </ul>
        </section>

        <p-divider />

        <section>
          <h3 class="text-lg font-semibold mb-2">数据共享</h3>
          <p class="text-sm">
            我们不会将您的个人数据出售、交易或以其他方式传输给外部第三方。
            数据仅与 Microsoft Clarity 与 New Relic 服务共享以提供分析功能。
          </p>
        </section>

        <p-divider />

        <section>
          <h3 class="text-lg font-semibold mb-2">联系我们</h3>
          <p class="text-sm">
            如果您对本隐私政策有任何疑问，请通过 GitHub 仓库或反馈表格与我们联系。
          </p>
        </section>
      </div>

      <ng-template #footer>
        <div class="flex justify-end">
          <p-button
            severity="secondary"
            (click)="visibleChange.emit(false)">
            关闭
          </p-button>
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class PrivacyPolicyDialog {
  visible = input(false)
  visibleChange = output<boolean>()
}

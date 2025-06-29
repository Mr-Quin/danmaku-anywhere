import { Component, input, output } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Button } from 'primeng/button'
import { Dialog } from 'primeng/dialog'
import { InputTextModule } from 'primeng/inputtext'

@Component({
  selector: 'da-kazumi-policy-readme',
  imports: [Button, Dialog, FormsModule, InputTextModule],
  template: `
    <p-dialog [modal]="true"
              (visibleChange)="visibleChange.emit($event)"
              [visible]="visible()" header="使用须知"
              draggable="false"
              maskStyleClass="backdrop-blur-sm" dismissableMask="true">
      <div class="max-w-3xl space-y-2">
        <p>
          <strong>Kazumi</strong>
        </p>
        <p>
          本应用的搜索与剧集信息获取功能，均依赖于 "Kazumi 规则"。</p>
        <p>
          <strong>工作原理</strong>
        </p>
        <p>
          当您执行搜索、获取剧集信息或视频资源等操作时，应用会在后台启动一个浏览器新窗口。它会自动访问相应的网站，并根据您选择的规则抓取所需信息。信息获取成功后，该窗口会自动关闭。
        </p>

        <p><strong>请注意：</strong></p>
        <ul class="list-disc list-inside ml-4">
          <li>每次操作都会打开一个新窗口。如果您同时执行多个任务，将会看到多个窗口。</li>
          <li>后台窗口在任务栏中可见，有时可能会一闪而过，这属于正常现象。</li>
          <li>窗口通常会在30秒内自动关闭。如果窗口长时间保持打开状态，请反馈BUG。</li>
          <li>由于应用会实际访问网站，因此<strong><u>会在您的浏览器中留下相应的历史记录</u></strong>。</li>
        </ul>

        <p>
          <strong>故障排查</strong>
        </p>
        <p>
          如果遇到搜索或获取资源失败的情况，建议您先尝试手动访问对应的网站，以确认网站本身是否可以正常使用。</p>
        <p>请合理使用本应用，切勿滥用。</p>
        <div class="flex gap-2 mt-4 float-right">
          <p-button severity="secondary" (onClick)="visibleChange.emit(false)">
            关闭
          </p-button>
          @if (!accepted()) {
            <p-button (onClick)="onAccept.emit()">
              知道了
            </p-button>
          }
        </div>
      </div>
    </p-dialog>
  `,
})
export class KazumiPolicyImportDialog {
  visible = input(false)
  visibleChange = output<boolean>()
  accepted = input(false)
  onAccept = output<void>()
}

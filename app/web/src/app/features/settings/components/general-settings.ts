import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { SHORTCUT_GROUPS } from '../../../core/shortcuts/shortcut.definitions'
import { ShortcutService } from '../../../core/shortcuts/shortcut.service'

@Component({
  selector: 'da-general-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6 flex flex-col gap-6">
      <div>
        <h2 class="text-xl font-semibold mb-2">通用设置</h2>
        <p class="text-surface-600 text-sm">
          快捷键在输入框、文本框等可编辑区域中不会触发。
        </p>
      </div>

      <label class="flex items-center gap-3 cursor-pointer w-fit">
        <input
          type="checkbox"
          class="w-4 h-4 accent-pink-500"
          [checked]="shortcutService.$enabled()"
          (change)="shortcutService.setEnabled(!shortcutService.$enabled())"
        />
        <span>启用键盘快捷键</span>
      </label>

      @for (group of groups; track group.label) {
        <section>
          <h3 class="text-lg font-medium mb-3">{{ group.label }}</h3>
          <div class="flex flex-col gap-1">
            @for (shortcut of group.shortcuts; track $index) {
              <div
                class="flex items-center justify-between py-2 border-b border-surface-200 dark:border-surface-700"
              >
                <span>{{ shortcut.label }}</span>
                <span class="flex gap-1">
                  @for (key of shortcut.keys; track $index) {
                    <kbd
                      class="px-2 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-sm font-mono"
                      >{{ key }}</kbd
                    >
                  }
                </span>
              </div>
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class GeneralSettings {
  protected readonly shortcutService = inject(ShortcutService)
  protected readonly groups = SHORTCUT_GROUPS
}

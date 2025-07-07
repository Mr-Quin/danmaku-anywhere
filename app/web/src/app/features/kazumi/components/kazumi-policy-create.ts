import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Button } from 'primeng/button'
import { InputTextModule } from 'primeng/inputtext'
import { TextareaModule } from 'primeng/textarea'

@Component({
  selector: 'da-kazumi-policy-create',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    Button,
    FormsModule,
    InputTextModule,
    TextareaModule,
  ],
  template: `
    <div class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="text-sm font-medium">规则名称 *</label>
          <input
            type="text"
            pInputText
            placeholder="输入规则名称"
            [(ngModel)]="policyName"
            class="w-full"
          />
          <p class="text-xs text-surface-500">规则的唯一标识符</p>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium">版本 *</label>
          <input
            type="text"
            pInputText
            placeholder="1.0.0"
            [(ngModel)]="policyVersion"
            class="w-full"
          />
          <p class="text-xs text-surface-500">遵循语义化版本规范</p>
        </div>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium">描述</label>
        <textarea
          pInputTextarea
          placeholder="描述这个规则的用途..."
          [(ngModel)]="policyDescription"
          rows="3"
          class="w-full"
        ></textarea>
        <p class="text-xs text-surface-500">可选：描述规则的功能和用途</p>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium">规则配置 *</label>
        <textarea
          pInputTextarea
          placeholder="输入 JSON 格式的规则配置..."
          [(ngModel)]="policyConfig"
          rows="8"
          class="w-full font-mono text-sm"
        ></textarea>
        <p class="text-xs text-surface-500">JSON 格式的 Kazumi 规则配置</p>
      </div>

      <div class="flex gap-3 justify-end">
        <p-button
          severity="secondary"
          text
          (click)="resetForm()"
        >
          重置
        </p-button>
        <p-button
          severity="primary"
          (click)="createPolicy()"
          [disabled]="!isFormValid()"
          [loading]="isCreating()"
        >
          创建规则
        </p-button>
      </div>
    </div>
  `,
})
export class KazumiPolicyCreate {
  protected policyName = signal('')
  protected policyVersion = signal('1.0.0')
  protected policyDescription = signal('')
  protected policyConfig = signal('')
  protected isCreating = signal(false)

  protected isFormValid() {
    return (
      this.policyName().trim() &&
      this.policyVersion().trim() &&
      this.policyConfig().trim()
    )
  }

  protected resetForm() {
    this.policyName.set('')
    this.policyVersion.set('1.0.0')
    this.policyDescription.set('')
    this.policyConfig.set('')
  }

  protected createPolicy() {
    if (!this.isFormValid()) return

    this.isCreating.set(true)

    try {
      // Validate JSON
      const config = JSON.parse(this.policyConfig())

      // TODO: Implement actual policy creation logic
      console.log('Creating policy:', {
        name: this.policyName(),
        version: this.policyVersion(),
        description: this.policyDescription(),
        config,
      })

      // Simulate API call
      setTimeout(() => {
        this.isCreating.set(false)
        this.resetForm()
        // TODO: Show success message and navigate back
      }, 1000)
    } catch (error) {
      this.isCreating.set(false)
      // TODO: Show error message for invalid JSON
      console.error('Invalid JSON:', error)
    }
  }
}

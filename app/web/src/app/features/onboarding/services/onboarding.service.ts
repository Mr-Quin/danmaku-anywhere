import { computed, Injectable, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { MessageService } from 'primeng/api'
import { KazumiService } from '../../kazumi/services/kazumi.service'

const ACCEPTED_POLICY_KEY = 'accepted-policy'

@Injectable({
  providedIn: 'root',
})
export class OnboardingService {
  private readonly kazumiService = inject(KazumiService)
  private readonly router = inject(Router)
  protected messageService = inject(MessageService)

  private readonly $_acceptedPolicy = signal(
    !!localStorage.getItem(ACCEPTED_POLICY_KEY),
  )
  readonly $acceptedPolicy = this.$_acceptedPolicy.asReadonly()

  readonly $isOnboardingComplete = computed(() => {
    return this.$_acceptedPolicy()
  })

  async acceptKazumiPolicyAndInstallRecommended(): Promise<void> {
    try {
      await this.kazumiService.addRecommendedPolicyMutation.mutateAsync()

      this.acceptPolicy()

      await this.router.navigate([''], { replaceUrl: true })
    } catch (_) {
      this.messageService.add({
        severity: 'error',
        detail: '添加规则失败',
        life: 3000,
      })
    }
  }

  private acceptPolicy() {
    this.$_acceptedPolicy.set(true)
    localStorage.setItem(ACCEPTED_POLICY_KEY, '1')
  }
}

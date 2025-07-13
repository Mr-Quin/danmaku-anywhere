import { inject } from '@angular/core'
import {
  type ActivatedRouteSnapshot,
  type CanActivateFn,
  RedirectCommand,
  Router,
  type RouterStateSnapshot,
} from '@angular/router'
import { MessageService } from 'primeng/api'
import { tryCatch } from '../../../shared/utils/tryCatch'
import { KazumiService } from '../services/kazumi.service'

export const validateKazumiPolicy: CanActivateFn = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router)
  const kazumiService = inject(KazumiService)
  const messageService = inject(MessageService)

  const redirect = new RedirectCommand(router.parseUrl('/kazumi/search'))

  // Check if all required query params are present
  const q = route.queryParamMap.get('q')
  const url = route.queryParamMap.get('url')
  const policyName = route.queryParamMap.get('policyName')

  if (!q || !url || !policyName) {
    messageService.add({
      severity: 'error',
      summary: '参数错误',
      detail: '缺少必要的参数',
      life: 3000,
    })
    return redirect
  }

  const [localPolicies, err] = await tryCatch(() =>
    kazumiService.localPoliciesQuery.promise()
  )
  // This really should not happen, but just in case
  if (err) {
    messageService.add({
      severity: 'error',
      summary: '加载规则失败',
      detail: '无法加载本地规则，请稍后再试',
      life: 3000,
    })
    return redirect
  }

  // Check if the policy exists
  const policyExists = localPolicies.some(
    (policy) => policy.name === policyName
  )
  if (!policyExists) {
    // Try to add the policy first
    try {
      await kazumiService.addPolicyMutation.mutateAsync(policyName)
      messageService.add({
        severity: 'success',
        summary: '规则已添加',
        detail: `成功添加规则 "${policyName}"`,
        life: 3000,
      })
      return true
    } catch (_) {
      messageService.add({
        severity: 'error',
        summary: '规则添加失败',
        detail: `无法添加规则 "${policyName}"，规则可能不存在`,
        life: 3000,
      })
      return redirect
    }
  }

  return true
}

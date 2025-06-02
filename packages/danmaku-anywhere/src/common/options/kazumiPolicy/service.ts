import { produce } from 'immer'

import type { PrevOptions } from '@/common/options/OptionsService/OptionsService'
import { OptionsService } from '@/common/options/OptionsService/OptionsService'
import type { KazumiPolicy } from '@/common/options/kazumiPolicy/schema'

const kazumiPolicyOptions = new OptionsService<KazumiPolicy[]>(
  'kazumiPolicy',
  [],
  'local'
).version(1, {
  upgrade: (data: PrevOptions) => data,
})

class KazumiPolicyService {
  public readonly options = kazumiPolicyOptions

  async getAll() {
    return this.options.get()
  }

  async get(name: string) {
    const policies = await this.options.get()

    return policies.find((item) => item.name === name)
  }

  async update(name: string, policy: KazumiPolicy) {
    const policies = await this.options.get()

    const existing = policies.find((item) => item.name === name)

    if (!existing) throw new Error(`Policy not found: "${name}"`)

    const newPolicy = { ...existing, ...policy }

    const newPolicies = produce(policies, (draft) => {
      const index = draft.findIndex((item) => item.name === name)
      draft[index] = newPolicy
    })

    await this.options.set(newPolicies)

    return newPolicy
  }

  async delete(name: string) {
    const configs = await this.options.get()

    const index = configs.findIndex((item) => item.name === name)

    console.log({ name, configs })
    if (index === -1) throw new Error(`Policy not found: "${name}"`)

    const newData = produce(configs, (draft) => {
      draft.splice(index, 1)
    })

    await this.options.set(newData)
  }

  async import(policy: KazumiPolicy) {
    const policies = await this.options.get()

    const existing = policies.find((item) => {
      return item.name === policy.name
    })

    if (existing) {
      await this.options.set([
        ...policies.filter((item) => item.name !== existing.name),
        policy,
      ])
      return existing
    }

    await this.options.set([...policies, policy])

    return policy
  }
}

export const kazumiPolicyService = new KazumiPolicyService()

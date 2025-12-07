import type { MountConfigInput } from '@/common/options/mountConfig/schema'

export type MountConfigForm = Omit<MountConfigInput, 'patterns'> & {
  patterns: { value: string }[]
}

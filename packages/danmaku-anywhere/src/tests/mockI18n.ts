import { vi } from 'vitest'

vi.mock('@/common/localization/i18n', () => ({
  i18n: {
    t: (key: string) => {
      return key
    },
  },
}))

import { describeError } from '@/common/errors/describeError'
import { i18n } from '@/common/localization/i18n'

export function mountFailedMessage(error: unknown): string {
  return i18n.t(
    'danmaku.alert.mountError',
    'Failed to mount danmaku: {{message}}',
    { message: describeError(error).message }
  )
}

import { i18n } from '@/common/localization/i18n'

type MountProblem = 'noActiveFrame' | 'mountFailed'

export class DanmakuMountError extends Error {
  constructor(
    readonly problem: MountProblem,
    message: string
  ) {
    super(message)
    this.name = 'DanmakuMountError'
  }
}

function describeMountProblem(problem: MountProblem): string {
  if (problem === 'noActiveFrame') {
    return i18n.t('integration.steps.checkVideoFail', 'Video is not detected')
  }
  return i18n.t('error.unknown', 'Something went wrong.')
}

export function describeMountError(error: unknown): string {
  if (error instanceof DanmakuMountError) {
    return i18n.t(
      'danmaku.alert.mountError',
      'Failed to mount danmaku: {{message}}',
      { message: describeMountProblem(error.problem) }
    )
  }
  return error instanceof Error ? error.message : String(error)
}

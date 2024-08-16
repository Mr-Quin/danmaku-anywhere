import type { DanmakuGetOneDto } from '@/common/danmaku/dto'

export const danmakuKeys = {
  all: () => [{ scope: 'danmaku' }] as const,
  one: (params: DanmakuGetOneDto) => [{ scope: 'danmaku', ...params }] as const,
}

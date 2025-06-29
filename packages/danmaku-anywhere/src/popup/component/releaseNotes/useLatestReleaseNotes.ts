import { useQuery } from '@tanstack/react-query'
import { EXTENSION_VERSION } from '@/common/constants'
import { Logger } from '@/common/Logger'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { controlQueryKeys } from '@/common/queries/queryKeys'

interface ReleaseNotesResponse {
  name: string
  body: string
  html_url: string
  published_at: string
}

export const useLatestReleaseNotes = () => {
  const { isLoading, data } = useExtensionOptions()

  const query = useQuery({
    queryFn: async () => {
      const res = await fetch(
        `https://api.github.com/repos/Mr-Quin/danmaku-anywhere/releases/tags/v${EXTENSION_VERSION}`
      )

      if (res.status !== 200) {
        Logger.warn(`Failed to get release notes for v${EXTENSION_VERSION}`)
        throw new Error(`Failed to get release notes for v${EXTENSION_VERSION}`)
      }

      const data: ReleaseNotesResponse = await res.json()
      return data
    },
    queryKey: controlQueryKeys.releaseNotes(),
    enabled: !isLoading && data.showReleaseNotes,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })

  return query
}

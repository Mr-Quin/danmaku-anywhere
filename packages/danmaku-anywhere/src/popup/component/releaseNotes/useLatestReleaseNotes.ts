import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'

import packageJson from '../../../../package.json'

import { useToast } from '@/common/components/Toast/toastStore'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'

interface ReleaseNotesResponse {
  name: string
  body: string
  html_url: string
  published_at: string
}

export const useLatestReleaseNotes = () => {
  const { toast } = useToast()
  const { isLoading, data } = useExtensionOptions()

  const query = useQuery({
    queryFn: async () => {
      const res = await fetch(
        `https://api.github.com/repos/Mr-Quin/danmaku-anywhere/releases/tags/v${packageJson.version}`
      )

      if (res.status !== 200) {
        throw new Error('Failed to get release notes')
      }

      const data: ReleaseNotesResponse = await res.json()
      return data
    },
    queryKey: ['release-notes'],
    enabled: !isLoading && data.showReleaseNotes,
    staleTime: Infinity,
    retry: false,
  })

  useEffect(() => {
    if (query.isError) {
      toast.error('Failed to get release notes')
    }
  }, [query.isError])

  return query
}

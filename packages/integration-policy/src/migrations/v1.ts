export interface IntegrationV1 {
  name: string
  id: string
  policy: {
    title: {
      selector: string[]
      regex: string[]
    }
    episode: {
      selector: string[]
      regex: string[]
    }
    season: {
      selector: string[]
      regex: string[]
    }
    episodeTitle: {
      selector: string[]
      regex: string[]
    }
    titleOnly: boolean
  }
}

export function isIntegrationV1(data: unknown): data is IntegrationV1 {
  return (
    typeof data === 'object' &&
    data !== null &&
    'name' in data &&
    'id' in data &&
    'policy' in data &&
    !('version' in data) &&
    !('options' in data)
  )
}

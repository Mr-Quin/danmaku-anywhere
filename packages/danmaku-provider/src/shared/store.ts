export const API_ROOT = 'https://danmaku.weeblify.app/proxy'

interface ApiStore {
  baseUrl: string
  ddpToken: string
  daVersion: string
  headers?: Record<string, string>
}

const apiStore: ApiStore = {
  baseUrl: API_ROOT,
  ddpToken: '',
  daVersion: '',
}

export const getApiStore = () => apiStore

export const configureApiStore = (options: Partial<typeof apiStore>) => {
  Object.assign(apiStore, options)
}

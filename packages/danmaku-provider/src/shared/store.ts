export const API_ROOT = 'https://api.danmaku.weeblify.app'

interface ApiStore {
  baseUrl: string
  ddpToken: string
  daVersion: string
  daId: string
  headers?: Record<string, string>
}

const apiStore: ApiStore = {
  baseUrl: API_ROOT,
  ddpToken: '',
  daVersion: '',
  daId: '',
}

export const getApiStore = () => apiStore

export const configureApiStore = (options: Partial<typeof apiStore>) => {
  Object.assign(apiStore, options)
}

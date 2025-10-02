export const API_ROOT = 'https://api.danmaku.weeblify.app'

interface ApiStore {
  baseUrl: string
  ddpCustomApiUrl: string
  ddpUseCustomUrl: boolean
  ddpToken: string
  daVersion: string
  daId: string
  headers?: Record<string, string>
}

const apiStore: ApiStore = {
  baseUrl: API_ROOT,
  ddpCustomApiUrl: `${API_ROOT}/ddp/v1`,
  ddpUseCustomUrl: false,
  ddpToken: '',
  daVersion: '',
  daId: '',
}

export const getApiStore = () => apiStore

export const configureApiStore = (options: Partial<typeof apiStore>) => {
  Object.assign(apiStore, options)
}

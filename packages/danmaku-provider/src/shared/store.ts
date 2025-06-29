export const API_ROOT = 'https://danmaku.weeblify.app/proxy'

const apiStore = {
  baseUrl: API_ROOT,
  ddpToken: '',
  daVersion: '',
}

export const getApiStore = () => apiStore

export const configureApiStore = (options: Partial<typeof apiStore>) => {
  Object.assign(apiStore, options)
}

export const CF_API_ROOT = 'https://danmaku.weeblify.app/proxy'

export const cfStore = {
  baseUrl: CF_API_ROOT,
}

export const configureCf = (options: Partial<typeof cfStore>) => {
  Object.assign(cfStore, options)
}

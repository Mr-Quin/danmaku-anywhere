import defaultMountConfigJson from './mountConfig/default.json'
export interface MountConfig {
  patterns: string[]
  mediaQuery: string
  containerQuery: string
  predefined: boolean
  enabled: boolean
  name: string
  id: number
}

export interface MountConfigOptions {
  configs: MountConfig[]
}

export interface MountConfigWithoutId extends Omit<MountConfig, 'id'> {
  id?: number
}

export const createMountConfig = (url: string): MountConfigWithoutId => {
  return {
    patterns: [url],
    mediaQuery: '',
    containerQuery: '',
    predefined: false,
    enabled: true,
    name: '',
  }
}

export const defaultMountConfig: MountConfig[] = defaultMountConfigJson.map(
  (config, index) => {
    return {
      ...config,
      id: index,
      predefined: true,
    }
  }
)

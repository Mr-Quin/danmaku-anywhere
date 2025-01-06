import { useEffect, useState } from 'react'

const devExtensionId = 'pcgalclpifdedeajajbmcfpdhpleligc'
const prodExtensionId = 'hnpmcmakfnaechbbbjmchepmhkdllono'

const extensionId = import.meta.env.DEV ? devExtensionId : prodExtensionId

const getPagePattern = () => {
  // convert url to a pattern
  // https://www.example.com/abc -> https://www.example.com/*
  const url = new URL(window.location.href)
  return url.origin + '/*'
}

export const getHasExtension = () =>
  typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined'

export const useConfig = () => {
  const hasExtension = getHasExtension()

  const [hasConfig, setHasConfig] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string>()

  const checkConfig = async () => {
    setLoaded(false)
    try {
      const { output: configs } = await chrome.runtime.sendMessage(
        extensionId,
        {
          method: 'mountConfigGetAll',
        }
      )

      const existingConfig = configs.find((config: any) =>
        config.patterns.includes(getPagePattern())
      )

      setHasConfig(existingConfig?.enabled ?? false)

      setLoaded(true)
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message)
      }
    }
  }

  const createConfig = async () => {
    if (!hasExtension || hasConfig) return

    const pageConfig = {
      patterns: [getPagePattern()],
      mediaQuery: 'video',
      enabled: true,
      integration: undefined,
      name: 'Danmaku Anywhere Docs',
    }

    try {
      const res = await chrome.runtime.sendMessage(extensionId, {
        method: 'mountConfigCreate',
        input: pageConfig,
      })
      if (res.error) {
        setError(JSON.stringify(res.error))
        return
      }
      // refresh page after adding config so it can take effect
      window.location.reload()
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message)
      }
    }
  }

  useEffect(() => {
    if (!hasExtension) return
    void checkConfig()
  }, [])

  return {
    hasConfig,
    loaded,
    error,
    checkConfig,
    createConfig,
  }
}

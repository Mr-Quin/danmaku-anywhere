export interface Asset {
  name: string
  browser_download_url: string
  size: number
}

export interface Release {
  id: number
  name: string
  tag_name: string
  published_at: string
  html_url: string
  assets: Asset[]
  prerelease: boolean
  body: string
}

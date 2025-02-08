export const uriDecode = (url: string) => {
  try {
    return decodeURIComponent(url)
  } catch {
    return url
  }
}

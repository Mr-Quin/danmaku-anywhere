import { injectable } from 'inversify'

@injectable()
export class ImageCacheService {
  async get(src: string): Promise<string | null> {
    try {
      const blob = await this.fetchImageBlob(src)
      return await this.blobToDataUrl(blob)
    } catch {
      return null
    }
  }

  private fetchImageBlob = async (src: string): Promise<Blob> => {
    const res = await fetch(src)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching image: ${src}`)
    }
    return res.blob()
  }

  private blobToDataUrl = async (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
        } else {
          reject('failed to convert image to base64')
        }
      }
      reader.onerror = (e) => {
        reject(e)
      }
      reader.readAsDataURL(blob)
    })
  }
}

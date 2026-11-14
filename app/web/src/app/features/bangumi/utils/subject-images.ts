export interface SubjectImageSet {
  large?: string
  common?: string
  medium?: string
  small?: string
  grid?: string
}

// Detail headers and the video player show the poster large, so it keeps the
// largest variant.
export function preferredPoster(
  images: SubjectImageSet | null | undefined
): string {
  return images?.large || images?.common || images?.medium || ''
}

export function preferredCover(
  images: SubjectImageSet | null | undefined
): string {
  return images?.common || images?.medium || images?.large || ''
}

export function preferredThumbnail(
  images: SubjectImageSet | null | undefined
): string {
  return images?.grid || images?.small || images?.common || images?.medium || ''
}

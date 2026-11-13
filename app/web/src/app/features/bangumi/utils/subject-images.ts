export interface SubjectImageSet {
  large?: string
  common?: string
  medium?: string
  small?: string
  grid?: string
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

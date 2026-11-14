import type { ShowCardData } from '../components/show-card'
import type { BgmSlimSubject } from '../types/bangumi.types'
import { preferredCover } from './subject-images'

export const transformToShowCardData = (
  subject: BgmSlimSubject
): ShowCardData => {
  return {
    id: subject.id,
    altTitle: subject.name,
    title: subject.nameCN || subject.name,
    rating: subject.rating,
    rank: subject.rating.rank,
    cover: preferredCover(subject.images),
  }
}

import type { BgmSlimSubject } from '../types/bangumi.types'
import type { ShowCardData } from './show-card'

export const transformToShowCardData = (
  subject: BgmSlimSubject
): ShowCardData => {
  return {
    id: subject.id,
    altTitle: subject.name,
    title: subject.nameCN || subject.name,
    rating: subject.rating,
    rank: subject.rating.rank,
    cover: subject.images?.large,
  }
}

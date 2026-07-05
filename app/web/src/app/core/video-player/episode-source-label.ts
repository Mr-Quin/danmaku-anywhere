import {
  DanmakuSourceType,
  type GenericEpisodeLite,
  providerTypeFromManifestId,
  resolveBuiltinManifestId,
} from '@danmaku-anywhere/danmaku-converter'

// Source label rendered under an episode. A custom episode has no season; a
// non-builtin (catalog) manifest labels as its own id because
// providerTypeFromManifestId would report the neutral DanDanPlay tag; an
// orphaned source episode has no manifestId and shows nothing.
export function episodeSourceLabel(episode: GenericEpisodeLite): string {
  if (!('season' in episode)) {
    return DanmakuSourceType.MacCMS
  }
  const manifestId = episode.season.manifestId
  if (!manifestId) {
    return ''
  }
  if (resolveBuiltinManifestId(manifestId)) {
    return providerTypeFromManifestId(manifestId)
  }
  return manifestId
}

export type SeasonMapSnapshot = {
  // Title of the show
  key: string
  // A map of provider config ID to season ID
  seasons: Record<string, number>
  // A list of season IDs
  seasonIds: number[]
}

type SeasonLike = {
  providerConfigId: string
  id: number
}

export class SeasonMap {
  readonly key: string
  private readonly seasonsByConfig: Map<string, number>
  private readonly seasonIdSet: Set<number>

  private constructor(
    key: string,
    seasonsByConfig: Map<string, number>,
    seasonIdSet: Set<number>
  ) {
    this.key = key
    this.seasonsByConfig = seasonsByConfig
    this.seasonIdSet = seasonIdSet
  }

  static empty(key: string) {
    return new SeasonMap(key, new Map(), new Set())
  }

  static fromSeason(key: string, season: SeasonLike) {
    return SeasonMap.empty(key).withMapping(season.providerConfigId, season.id)
  }

  static fromSnapshot(snapshot: SeasonMapSnapshot) {
    const map = new Map(Object.entries(snapshot.seasons))
    const ids = new Set(
      snapshot.seasonIds.length
        ? snapshot.seasonIds
        : Object.values(snapshot.seasons)
    )
    return new SeasonMap(snapshot.key, map, ids)
  }

  static from(input: SeasonMap | SeasonMapSnapshot) {
    return input instanceof SeasonMap ? input : SeasonMap.fromSnapshot(input)
  }

  static reviveAll(list: Array<SeasonMap | SeasonMapSnapshot>) {
    return list.map((entry) => SeasonMap.from(entry))
  }

  static findByKey(
    seasonMaps: Array<SeasonMap | SeasonMapSnapshot>,
    key: string
  ) {
    const hit = seasonMaps.find((item) => item.key === key)
    return hit ? SeasonMap.from(hit) : undefined
  }

  static hasMapping(
    seasonMaps: Array<SeasonMap | SeasonMapSnapshot>,
    key: string,
    providerConfigId: string,
    seasonId: number
  ) {
    const map = SeasonMap.findByKey(seasonMaps, key)
    if (!map) {
      return false
    }
    return map.matches(providerConfigId, seasonId)
  }

  toSnapshot(): SeasonMapSnapshot {
    return {
      key: this.key,
      seasons: this.seasons,
      seasonIds: this.seasonIds,
    }
  }

  get seasons() {
    return Object.fromEntries(this.seasonsByConfig.entries())
  }

  get seasonIds() {
    return Array.from(this.seasonIdSet.values())
  }

  getSeasonId(providerConfigId: string) {
    return this.seasonsByConfig.get(providerConfigId)
  }

  matches(providerConfigId: string, seasonId: number) {
    return this.getSeasonId(providerConfigId) === seasonId
  }

  withMapping(providerConfigId: string, seasonId: number) {
    const seasons = new Map(this.seasonsByConfig)
    seasons.set(providerConfigId, seasonId)
    const ids = new Set(this.seasonIdSet)
    ids.add(seasonId)
    return new SeasonMap(this.key, seasons, ids)
  }

  merge(other: SeasonMap | SeasonMapSnapshot) {
    const toMerge = SeasonMap.from(other)
    let result: SeasonMap = this
    for (const [providerConfigId, seasonId] of toMerge.seasonsByConfig) {
      result = result.withMapping(providerConfigId, seasonId)
    }
    return result
  }

  withoutSeasonId(seasonId: number) {
    const seasons = new Map(this.seasonsByConfig)
    for (const [providerConfigId, id] of seasons.entries()) {
      if (id === seasonId) {
        seasons.delete(providerConfigId)
      }
    }
    const ids = new Set(this.seasonIdSet)
    ids.delete(seasonId)
    return new SeasonMap(this.key, seasons, ids)
  }

  isEmpty() {
    return this.seasonsByConfig.size === 0
  }
}

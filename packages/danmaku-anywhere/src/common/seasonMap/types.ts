/**
 * Plain JSON representation used for persistence and RPC calls.
 */
export type SeasonMapSnapshot = {
  key: string
  seasons: Record<string, number>
  seasonIds: number[]
}

type SeasonLike = {
  providerConfigId: string
  id: number
}

/**
 * Rich helper used across background/content scripts for season mappings.
 */
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

  /**
   * Build an empty mapping for a key.
   */
  static empty(key: string) {
    return new SeasonMap(key, new Map(), new Set())
  }

  /**
   * Create a mapping that links the provided season immediately.
   */
  static fromSeason(key: string, season: SeasonLike) {
    return SeasonMap.empty(key).withMapping(season.providerConfigId, season.id)
  }

  /**
   * Hydrate a SeasonMap from its persisted snapshot.
   */
  static fromSnapshot(snapshot: SeasonMapSnapshot) {
    const map = new Map(Object.entries(snapshot.seasons))
    const ids = new Set(
      snapshot.seasonIds.length
        ? snapshot.seasonIds
        : Object.values(snapshot.seasons)
    )
    return new SeasonMap(snapshot.key, map, ids)
  }

  /**
   * Normalize any acceptable representation into a SeasonMap instance.
   */
  static from(input: SeasonMap | SeasonMapSnapshot) {
    return input instanceof SeasonMap ? input : SeasonMap.fromSnapshot(input)
  }

  /**
   * Convenience helper for eagerly reviving a collection returned from RPC.
   */
  static reviveAll(list: Array<SeasonMap | SeasonMapSnapshot>) {
    return list.map((entry) => SeasonMap.from(entry))
  }

  /**
   * Locate a mapping for the provided key within a collection.
   */
  static findByKey(
    seasonMaps: Array<SeasonMap | SeasonMapSnapshot>,
    key: string
  ) {
    const hit = seasonMaps.find((item) => item.key === key)
    return hit ? SeasonMap.from(hit) : undefined
  }

  /**
   * Determine whether a mapping exists for a specific provider+season pair.
   */
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

  /**
   * Returns a plain JSON representation suitable for Dexie / RPC.
   */
  toSnapshot(): SeasonMapSnapshot {
    return {
      key: this.key,
      seasons: this.seasons,
      seasonIds: this.seasonIds,
    }
  }

  /**
   * List of mappings keyed by provider config id.
   */
  get seasons() {
    return Object.fromEntries(this.seasonsByConfig.entries())
  }

  /**
   * Unique list of season ids tied to this key.
   */
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
    let result = this
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

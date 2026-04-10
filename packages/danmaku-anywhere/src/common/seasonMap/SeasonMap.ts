export type SeasonMapSnapshot = {
  // Title of the show
  key: string
  // A map of provider config ID to season ID
  seasons: Record<string, number>
  // A list of season IDs derived from the map. This is separated for use as a key in IDB
  seasonIds: number[]
  // Optional folder path pointing to a naming rule
  local?: string
}

type SeasonLike = {
  providerConfigId: string
  id: number
}

export class SeasonMap {
  private constructor(
    readonly key: string,
    private readonly seasonsByConfig: Map<string, number>,
    readonly local?: string
  ) {}

  static empty(key: string) {
    return new SeasonMap(key, new Map())
  }

  static fromSeason(key: string, season: SeasonLike) {
    return SeasonMap.empty(key).withMapping(season.providerConfigId, season.id)
  }

  static fromSnapshot(snapshot: SeasonMapSnapshot) {
    const map = new Map(Object.entries(snapshot.seasons))
    return new SeasonMap(snapshot.key, map, snapshot.local)
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

  // get deduplicated season IDs
  getSeasonIds() {
    return Array.from(new Set(this.seasonsByConfig.values()))
  }

  toSnapshot(): SeasonMapSnapshot {
    return {
      key: this.key,
      seasons: this.seasons,
      seasonIds: this.getSeasonIds(),
      local: this.local,
    }
  }

  get seasons() {
    return Object.fromEntries(this.seasonsByConfig.entries())
  }

  get seasonIds() {
    return this.getSeasonIds()
  }

  getSeasonId(providerConfigId: string) {
    return this.seasonsByConfig.get(providerConfigId)
  }

  matches(providerConfigId: string, seasonId: number) {
    return this.getSeasonId(providerConfigId) === seasonId
  }

  isEmpty() {
    return this.seasonsByConfig.size === 0 && !this.local
  }

  merge(other: SeasonMap | SeasonMapSnapshot) {
    const toMerge = SeasonMap.from(other)
    let result: SeasonMap = this
    for (const [providerConfigId, seasonId] of toMerge.seasonsByConfig) {
      result = result.withMapping(providerConfigId, seasonId)
    }
    // Preserve local from self, fall back to other
    const mergedLocal = this.local ?? toMerge.local
    if (mergedLocal !== result.local) {
      result = new SeasonMap(
        result.key,
        new Map(result.seasonsByConfig),
        mergedLocal
      )
    }
    return result
  }

  withMapping(providerConfigId: string, seasonId: number) {
    const seasons = new Map(this.seasonsByConfig)
    seasons.set(providerConfigId, seasonId)
    return new SeasonMap(this.key, seasons, this.local)
  }

  withLocal(folderPath: string) {
    return new SeasonMap(this.key, new Map(this.seasonsByConfig), folderPath)
  }

  withoutLocal() {
    return new SeasonMap(this.key, new Map(this.seasonsByConfig))
  }

  withoutSeasonId(seasonId: number) {
    const seasons = new Map(this.seasonsByConfig)
    for (const [providerConfigId, id] of seasons.entries()) {
      if (id === seasonId) {
        seasons.delete(providerConfigId)
      }
    }
    return new SeasonMap(this.key, seasons, this.local)
  }

  withoutProvider(providerConfigId: string) {
    const seasons = new Map(this.seasonsByConfig)
    seasons.delete(providerConfigId)
    return new SeasonMap(this.key, seasons, this.local)
  }
}

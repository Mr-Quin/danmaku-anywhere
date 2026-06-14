export type SeasonMapSnapshot = {
  // Title of the show
  key: string
  // A map of namespaceKey to season ID
  seasons: Record<string, number>
  // A list of season IDs derived from the map. This is separated for use as a key in IDB
  seasonIds: number[]
  // Optional folder path pointing to a naming rule
  local?: string
}

type SeasonLike = {
  namespaceKey?: string
  id: number
}

export class SeasonMap {
  private constructor(
    readonly key: string,
    private readonly seasonsByNamespace: Map<string, number>,
    readonly local?: string
  ) {}

  static empty(key: string) {
    return new SeasonMap(key, new Map())
  }

  static fromSeason(key: string, season: SeasonLike) {
    // A season whose config was deleted before the migration has no namespace
    // and no live config, so it could never be retrieved by namespace anyway.
    if (season.namespaceKey == null) {
      return SeasonMap.empty(key)
    }
    return SeasonMap.empty(key).withMapping(season.namespaceKey, season.id)
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
    namespaceKey: string,
    seasonId: number
  ) {
    const map = SeasonMap.findByKey(seasonMaps, key)
    if (!map) {
      return false
    }
    return map.matches(namespaceKey, seasonId)
  }

  // get deduplicated season IDs
  getSeasonIds() {
    return Array.from(new Set(this.seasonsByNamespace.values()))
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
    return Object.fromEntries(this.seasonsByNamespace.entries())
  }

  get seasonIds() {
    return this.getSeasonIds()
  }

  getSeasonId(namespaceKey: string) {
    return this.seasonsByNamespace.get(namespaceKey)
  }

  matches(namespaceKey: string, seasonId: number) {
    return this.getSeasonId(namespaceKey) === seasonId
  }

  merge(other: SeasonMap | SeasonMapSnapshot) {
    const toMerge = SeasonMap.from(other)
    const seasons = new Map(this.seasonsByNamespace)
    for (const [namespaceKey, seasonId] of toMerge.seasonsByNamespace) {
      seasons.set(namespaceKey, seasonId)
    }
    // Preserve self.local when the other side didn't set one; additive merge
    return new SeasonMap(this.key, seasons, toMerge.local ?? this.local)
  }

  withMapping(namespaceKey: string, seasonId: number) {
    const seasons = new Map(this.seasonsByNamespace)
    seasons.set(namespaceKey, seasonId)
    return new SeasonMap(this.key, seasons, this.local)
  }

  withLocal(folderPath: string) {
    return new SeasonMap(this.key, new Map(this.seasonsByNamespace), folderPath)
  }

  withoutLocal() {
    return new SeasonMap(this.key, new Map(this.seasonsByNamespace))
  }

  withoutSeasonId(seasonId: number) {
    const seasons = new Map(this.seasonsByNamespace)
    for (const [namespaceKey, id] of seasons.entries()) {
      if (id === seasonId) {
        seasons.delete(namespaceKey)
      }
    }
    return new SeasonMap(this.key, seasons, this.local)
  }

  withoutProvider(namespaceKey: string) {
    const seasons = new Map(this.seasonsByNamespace)
    seasons.delete(namespaceKey)
    return new SeasonMap(this.key, seasons, this.local)
  }
}

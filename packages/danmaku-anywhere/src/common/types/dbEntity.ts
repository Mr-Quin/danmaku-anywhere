type DbEntityBase = Readonly<{
  // How many times the entity has been updated
  version: number
  // The last time the entity was updated
  timeUpdated: number
  // Auto generated id
  id: number
}>

export type DbEntity<T> = T & DbEntityBase

export type MaybeDbEntity<T> = T & Partial<DbEntityBase>

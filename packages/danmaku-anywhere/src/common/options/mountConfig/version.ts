// Bump this when adding a new `.version(N, …)` to MountConfigService so seed
// helpers and migration tools track the latest schema. Kept in its own file
// so consumers (e.g. e2e setup) can import without pulling Inversify-decorated
// service code into their bundler.
export const LATEST_MOUNT_CONFIG_VERSION = 6

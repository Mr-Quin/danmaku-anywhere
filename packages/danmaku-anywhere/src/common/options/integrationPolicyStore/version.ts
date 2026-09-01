// Bump this when adding a new `.version(N, …)` to IntegrationPolicyService so
// seed helpers and migration tools track the latest schema. Kept in its own
// file so consumers (e.g. e2e setup) can import without pulling Inversify-
// decorated service code into their bundler.
export const LATEST_INTEGRATION_POLICY_VERSION = 5

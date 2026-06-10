// Undefined values in configValues would shadow manifest schema defaults when
// spread; drop them before merging.
function stripUndefined(o: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined) out[k] = v
  }
  return out
}

// Precedence (low to high): configSchema defaults, user-configured values,
// per-call inputs (providerIds / meta.params). Shared so an ad-hoc test run
// resolves inputs exactly as the saved-provider path does.
export function resolveManifestInputs(
  defaults: Record<string, unknown>,
  configValues: Record<string, unknown> | undefined,
  perCall: Record<string, unknown>
): Record<string, unknown> {
  return { ...defaults, ...stripUndefined(configValues ?? {}), ...perCall }
}

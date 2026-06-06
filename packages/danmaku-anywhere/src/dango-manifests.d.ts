// @mr-quin/dango-manifests ships JSON manifests with no type declarations, and
// tsc does not consistently resolve the package subpath across modules. Declare
// it so the imports type-check; the bundler resolves the real files at build.
declare module '@mr-quin/dango-manifests/manifests/*.json' {
  const value: unknown
  export default value
}

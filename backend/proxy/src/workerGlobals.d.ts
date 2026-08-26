// The Workers runtime types declare `crypto` with `declare const`, which does not put it on
// `typeof globalThis`. Redeclare it so `globalThis.crypto` resolves.
declare global {
  var crypto: Crypto
}

export {}

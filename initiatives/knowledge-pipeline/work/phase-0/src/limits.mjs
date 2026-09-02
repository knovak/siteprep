export const PACKAGE_LIMITS = Object.freeze({
  maxManifestBytes: 25 * 1024 * 1024,
  maxPackageBytes: 250 * 1024 * 1024,
  maxOperations: 100_000,
  maxEntries: 2_048,
  maxEntryBytes: 64 * 1024 * 1024,
  maxExpandedBytes: 250 * 1024 * 1024,
  maxCompressionRatio: 100,
  maxPathDepth: 32,
  maxEntityTextBytes: 1024 * 1024,
});

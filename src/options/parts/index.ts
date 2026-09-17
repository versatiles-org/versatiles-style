/**
 * The option modules that compose into `osm()` and `satellite()`: one import for everything the
 * composite resolvers need, instead of a seventeen-line preamble in each of them.
 *
 * ⚠️ **Nothing re-exported here may import this file.** That is the whole rule, and it is what keeps
 * the module graph acyclic. The modules themselves form a small DAG — `color-keys` and `resolve-url`
 * import nothing, `keys` reads the v5 hints, `colors` and `urls` build on those — so a barrel over them
 * is safe as long as none of them reaches back through it. `osm-overlay`, `osm` and `satellite` sit
 * *above* this file and import from it, which is why they are deliberately absent.
 *
 * A cycle here would not fail loudly: it would surface as a temporal-dead-zone error at a module-level
 * initialiser such as `DEFAULT_BASE`, far from the import that caused it. Two things stop that: a
 * `no-restricted-imports` rule in `eslint.config.js`, which covers both `'./index.js'` and the bare
 * `'.'` that slipped past it once, and `src/import-graph.test.ts`, which fails on any cycle at all.
 */

export * from './colors.js';
export * from './features-hillshade.js';
export * from './features-terrain.js';
export * from './features.js';
export * from './icon.js';
export * from './keys.js';
export * from './layer-groups.js';
export * from './projection.js';
export * from './recolor.js';
export * from './resolve-url.js';
export * from './satellite-raster.js';
export * from './sky.js';
export * from './sprite.js';
export * from './sun.js';
export * from './text.js';
export * from './theme.js';
export * from './urls.js';
export * from './v5-hints.js';

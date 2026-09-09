/**
 * The option modules that compose into `osm()` and `satellite()`: one import for everything the
 * composite resolvers need, instead of a seventeen-line preamble in each of them.
 *
 * ⚠️ **Nothing re-exported here may import this file.** That is the whole rule, and it is what
 * keeps the module graph acyclic. These modules form two tiers — leaves that import nothing
 * internal, and `colors`/`urls`/`features`, which import only leaves — so a barrel over them is
 * safe. `osm-overlay`, `osm` and `satellite` sit *above* this file and import from it, which is
 * why they are deliberately absent.
 *
 * A cycle here would not fail loudly: it would surface as a temporal-dead-zone error at a
 * module-level initialiser such as `DEFAULT_BASE`, far from the import that caused it. An
 * `no-restricted-imports` rule in `eslint.config.js` enforces the rule mechanically.
 */

export * from './theme.js';
export * from './colors.js';
export * from './recolor.js';
export * from './text.js';
export * from './layout.js';
export * from './features-hillshade.js';
export * from './features-terrain.js';
export * from './features.js';
export * from './sun.js';
export * from './sky.js';
export * from './projection.js';
export * from './sprite.js';
export * from './layer-groups.js';
export * from './urls.js';
export * from './satellite-raster.js';

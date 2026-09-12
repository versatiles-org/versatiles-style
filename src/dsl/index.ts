/**
 * The layer DSL: a schema-neutral vocabulary for emitting MapLibre layers.
 *
 * `build.ts` turns camelCase style props (`color`, `size`, `opacity`, `appear`, …) into MapLibre
 * paint/layout properties and zoom expressions, tags each layer with its semantic group path, and
 * gates the assembled stream on the resolved `layers:` options. `context.ts` derives everything a
 * group generator needs from the resolved options, given the two things only a schema knows (its
 * source name and its name-field convention).
 *
 * Nothing here knows which tileset it is building for — that is the point. It was lifted out of
 * `src/shortbread/` so a second schema composes the same DSL rather than a copy of it, which also
 * makes it the one real coupling point between schemas: a change here is felt by all of them, so
 * `build.test.ts` travels with it (SCHEMA-SUPPORT-PLAN.md §7 step 3, risk 12).
 */
export * from './build.js';
export { buildLayerContext } from './context.js';
export type { LayerContext, ColorSet, ContextSeam } from './context.js';

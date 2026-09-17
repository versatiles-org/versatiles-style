import type { LayerContext } from '../context.js';
import type { TaggedLayer } from '../../dsl/index.js';
import { buildings as build, buildings3d as build3d, type BuildingVocabulary } from '../../cartography/index.js';

// OpenMapTiles' building names. `render_height`/`render_min_height` carry the prefix because
// OpenMapTiles pre-computes them from the building's tags; `hide_3d` survives under its own name, and
// the sample found no `class` or `subclass` at all, so the fills are unfiltered as in Shortbread.
const VOCAB: BuildingVocabulary = {
	sourceLayer: 'building',
	height: 'render_height',
	minHeight: 'render_min_height',
};

export function* buildings(ctx: LayerContext): Generator<TaggedLayer> {
	yield* build(ctx, VOCAB);
}

export function* buildings3d(ctx: LayerContext): Generator<TaggedLayer> {
	yield* build3d(ctx, VOCAB);
}

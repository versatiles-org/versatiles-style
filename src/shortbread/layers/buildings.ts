import type { LayerContext } from '../context.js';
import type { TaggedLayer } from '../../dsl/index.js';
import { buildings as build, buildings3d as build3d, type BuildingVocabulary } from '../../cartography/buildings.js';

// Shortbread's building names. The cartography is shared — see `src/cartography/buildings.ts`.
const VOCAB: BuildingVocabulary = { sourceLayer: 'buildings', height: 'height', minHeight: 'min_height' };

export function* buildings(ctx: LayerContext): Generator<TaggedLayer> {
	yield* build(ctx, VOCAB);
}

export function* buildings3d(ctx: LayerContext): Generator<TaggedLayer> {
	yield* build3d(ctx, VOCAB);
}

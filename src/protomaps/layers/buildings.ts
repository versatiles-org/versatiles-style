import type { LayerContext } from '../context.js';
import type { TaggedLayer } from '../../dsl/index.js';
import { buildings as build, buildings3d as build3d, type BuildingVocabulary } from '../../cartography/index.js';

// Protomaps names its building fields exactly as Shortbread does — `height`, `min_height` — which makes
// this the one module where two schemas share a vocabulary outright. Verified from the archive metadata;
// the layer also carries `kind`/`kind_detail`, which the fills do not need. It starts at z11 rather than
// z14, so the fade-in is the only thing holding the footprints back.
const VOCAB: BuildingVocabulary = { sourceLayer: 'buildings', height: 'height', minHeight: 'min_height' };

export function* buildings(ctx: LayerContext): Generator<TaggedLayer> {
	yield* build(ctx, VOCAB);
}

export function* buildings3d(ctx: LayerContext): Generator<TaggedLayer> {
	yield* build3d(ctx, VOCAB);
}

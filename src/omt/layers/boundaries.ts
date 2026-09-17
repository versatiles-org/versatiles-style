import type { LayerContext } from '../context.js';
import type { TaggedLayer } from '../../dsl/index.js';
import { boundaries as draw, type BoundaryVocabulary } from '../../cartography/index.js';

// OpenMapTiles carries `disputed` and `maritime` as integers 0/1, verified by
// `npm run schema-values -- omt boundary`. Getting this wrong draws no disputed borders at all, with no
// error and nothing for the conformance suite to see — the field exists, only its type differs.
//
// `admin_level` reaches 10 here against Shortbread's 2 and 4, but only the two levels the style draws
// are relevant. OpenMapTiles serves `boundary` from z0, so the state fade at z7 is purely cartographic.
const VOCAB: BoundaryVocabulary = { sourceLayer: 'boundary', flagTrue: 1 };

export function* boundaries(ctx: LayerContext): Generator<TaggedLayer> {
	yield* draw(ctx, VOCAB);
}

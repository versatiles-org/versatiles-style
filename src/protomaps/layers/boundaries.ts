import type { LayerContext } from '../context.js';
import type { TaggedLayer } from '../../dsl/index.js';
import { boundaries as draw, type BoundaryVocabulary } from '../../cartography/boundaries.js';

// Protomaps carries `disputed` as a **boolean**, like Shortbread and unlike OpenMapTiles' integer —
// verified by `npm run schema-values -- protomaps boundaries`. The three schemas encode the same flag
// three different ways, which is why the shared cartography takes it as vocabulary.
//
// The admin level is `kind_detail` (2, 3, 4 …) rather than `admin_level`, and `kind` carries a class of
// its own (country / region / county / locality). There is no `maritime` field at all, so the maritime
// layer is **not emitted**: a filter on a missing field matches nothing silently, which the conformance
// audit flags and which is precisely the bug class this project keeps finding.
const VOCAB: BoundaryVocabulary = {
	sourceLayer: 'boundaries',
	flagTrue: true,
	adminLevelField: 'kind_detail',
	hasMaritime: false,
};

export function* boundaries(ctx: LayerContext): Generator<TaggedLayer> {
	yield* draw(ctx, VOCAB);
}

import type { LayerContext } from '../context.js';
import type { TaggedLayer } from '../../dsl/index.js';
import { boundaries as draw, type BoundaryVocabulary } from '../../cartography/index.js';

// Shortbread carries `disputed` and `maritime` as booleans. The cartography is shared — see
// `src/cartography/boundaries.ts`, and the note there on why the flag's type is vocabulary.
const VOCAB: BoundaryVocabulary = { sourceLayer: 'boundaries', flagTrue: true };

export function* boundaries(ctx: LayerContext): Generator<TaggedLayer> {
	yield* draw(ctx, VOCAB);
}

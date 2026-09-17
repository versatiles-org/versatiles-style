import type { LayerContext } from '../context.js';
import * as b from '../../dsl/index.js';

// Background fill (bottom-most layer). Reads no tile data, so there is nothing for a schema to
// disagree about; restated because the render-order list is per-schema and this is first in it.
export function* background(ctx: LayerContext): Generator<b.TaggedLayer> {
	yield b.background('background', { color: ctx.c.background });
}

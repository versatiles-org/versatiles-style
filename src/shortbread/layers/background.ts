import type { LayerContext } from '../context.js';
import * as b from '../build.js';

// Background fill (bottom-most layer).
export function* background(ctx: LayerContext): Generator<b.TaggedLayer> {
	yield b.background('background', { color: ctx.c.background });
}

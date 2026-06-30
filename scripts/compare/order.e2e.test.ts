import { describe, expect, it } from 'vitest';
import { buildStyles } from './harness.js';
import { compareLayerOrder } from './order.js';

// Regression gate for "the colorful style stacks features in the same order as OSM Bright".
// We compare the RELATIVE draw order of every catalog feature pair (see order.ts). The two schemas
// stack a handful of band relationships differently for structural reasons; those are whitelisted in
// `ACCEPTED_ORDER_DIFFS`. Any inversion OUTSIDE that whitelist — a new band relationship flipping,
// e.g. buildings drawn above roads — is a regression and fails here.

describe('colorful layer order ≈ OSM Bright', () => {
	it('every feature pair stacks the same way (modulo accepted structural differences)', async () => {
		const { colorful, osmBright } = await buildStyles();
		const order = compareLayerOrder(colorful, osmBright);

		const lines = order.unaccepted.map(
			(i) =>
				`  ${i.a.band}/${i.a.name} is ${i.omt} ${i.b.band}/${i.b.name} in OSM Bright but reversed in colorful` +
				`  [${i.bandPair}]`
		);
		expect(order.unaccepted, `\n${lines.join('\n')}\n`).toHaveLength(0);
	});
});

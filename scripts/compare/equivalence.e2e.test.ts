import { describe, expect, it } from 'vitest';
import { compareAll } from './harness.js';

// Regression gate for "the colorful style is visually equivalent to OSM Bright".
// Every catalog case must resolve to the same visual styling (within tolerance) across all its
// zooms. Genuinely out-of-scope differences are declared per-case via `ignore` and don't count.

describe('colorful ≈ OSM Bright equivalence', () => {
	it('every case-zoom is styled identically (modulo accepted divergences)', async () => {
		const results = await compareAll();

		const failures = results
			.filter((r) => !r.pass)
			.map((r) => {
				const lines = r.zooms
					.filter((z) => z.diffs.length > 0)
					.map((z) => `    z${z.zoom}: ${z.diffs.join('; ')}`)
					.join('\n');
				return `  ${r.c.band} / ${r.c.name}\n${lines}`;
			});

		expect(failures, `\n${failures.join('\n')}\n`).toHaveLength(0);
	});
});

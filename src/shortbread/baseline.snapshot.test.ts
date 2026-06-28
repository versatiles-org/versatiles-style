import { describe, expect, it } from 'vitest';
import { osm } from '../api/osm.js';
import { satellite } from '../api/satellite.js';
import { normalizeStyle } from './normalize.js';

// Golden-file snapshot net for the per-group refactor.
//
// These snapshots are captured from the CURRENT (pre-refactor) pipeline and assert
// CONCEPTUAL parity (canonical colors, order-independent keys — see normalize.ts).
// As the layer modules are ported and osm() is switched over to them, these must keep
// passing — proving the refactor changed nothing visible.

describe('style output baseline (conceptual parity net)', () => {
	const variants: Record<string, () => unknown> = {
		'osm-colorful-light': () => osm({ theme: { palette: 'colorful', darkMode: false } }),
		'osm-colorful-dark': () => osm({ theme: { palette: 'colorful', darkMode: true } }),
		'osm-colorful-de': () => osm({ theme: 'colorful', text: { language: 'de' } }),
		'osm-gray-light': () => osm({ theme: 'gray' }),
		'osm-natural-light': () => osm({ theme: 'natural' }),
		'osm-muted-light': () => osm({ theme: 'muted' }),
		'osm-toner-light': () => osm({ theme: 'toner' }),
		satellite: () => satellite(),
	};

	for (const [name, build] of Object.entries(variants)) {
		it(`matches the baseline for ${name}`, () => {
			expect(normalizeStyle(build())).toMatchSnapshot();
		});
	}
});

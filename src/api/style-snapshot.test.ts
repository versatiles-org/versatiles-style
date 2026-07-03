import { describe, expect, it } from 'vitest';
import { osm } from './osm.js';
import { satellite } from './satellite.js';
import { getStyleVariants } from '../variants.js';
import type { StyleSpecification } from '../types/index.js';

// Regression guard against silent structural drift. We snapshot the *shape* of generated
// styles — version, source keys, and the ordered (id, type) list of layers — NOT the full
// paint/layout, which would be noisy. A reordered / renamed / dropped layer or source shows
// up as a reviewable snapshot diff instead of passing unnoticed.
//
// Update intentionally with `vitest -u` when a style change is expected.

// A compact, stable shape: enough to catch layer reorder/rename/removal and source changes,
// plus presence of the top-level 3D / sky blocks — without snapshotting every paint value.
function shape(style: StyleSpecification) {
	return {
		version: style.version,
		sources: Object.keys(style.sources).sort(),
		hasTerrain: style.terrain != null,
		hasLight: style.light != null,
		hasSky: style.sky != null,
		layers: style.layers.map((l) => `${l.type}:${l.id}`),
	};
}

describe('generated style shape snapshots', () => {
	it('osm colorful (light)', async () => {
		expect(shape(await osm({ theme: 'colorful' }))).toMatchSnapshot();
	});

	it('osm colorful (dark)', async () => {
		expect(shape(await osm({ theme: { palette: 'colorful', darkMode: true } }))).toMatchSnapshot();
	});

	it('osm colorful with terrain + hillshade + extruded buildings', async () => {
		expect(shape(await osm({ features: { terrain: true, hillshade: true, buildings: 'extruded' } }))).toMatchSnapshot();
	});

	it('satellite with toner overlay', async () => {
		expect(shape(await satellite({ osmOverlay: { theme: 'toner' } }))).toMatchSnapshot();
	});

	it('satellite raster-only (no overlay)', async () => {
		expect(shape(await satellite({ osmOverlay: false }))).toMatchSnapshot();
	});

	// A single coarse snapshot over ALL variants (name → layer count) catches any variant
	// gaining/losing layers without a large per-variant snapshot.
	it('variant layer counts', async () => {
		const variants = getStyleVariants();
		const counts: Record<string, number> = {};
		for (const v of variants) counts[v.name] = (await v.build()).layers.length;
		expect(counts).toMatchSnapshot();
	});
});

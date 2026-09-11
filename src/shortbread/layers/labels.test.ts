import { describe, expect, it } from 'vitest';
import { osm } from '../../api/index.js';
// Shortbread's `addresses` layer carries `unit` alongside `housenumber`, and where one number
// covers several spread-out units the number alone is ambiguous (issue #118).
describe('house-number labels include addr:unit', () => {
	const field = () =>
		(osm().layers.find((l) => l.id === 'label-address-housenumber') as { layout: Record<string, unknown> }).layout[
			'text-field'
		];

	it('appends the unit when present, and omits it otherwise', () => {
		expect(field()).toStrictEqual([
			'case',
			['has', 'unit'],
			['concat', ['get', 'housenumber'], '/', ['get', 'unit']],
			['get', 'housenumber'],
		]);
	});

	it('still requires a house number', () => {
		const layer = osm().layers.find((l) => l.id === 'label-address-housenumber') as { filter: unknown };
		expect(layer.filter).toStrictEqual(['has', 'housenumber']);
	});
});

// A feature can be BOTH a named water polygon and a POI — a fountain mapped as an area is in
// `water_polygons_labels` AND in `pois` with `amenity=fountain` — so above z18.5, where the POI's
// own text fades in, its name is available from two layers at once (A8).
//
// Nothing in the data can dedupe that; the two source-layers describe one object. What resolves it
// is symbol collision, and the resolution is a property of LAYER ORDER: MapLibre places symbol
// layers last-to-first (`pauseable_placement.ts` starts at `order.length - 1` and decrements), so
// the LATER layer claims its collision space first and wins. The water label is emitted after the
// POIs and therefore keeps the name, while the POI — which is `text-optional` — drops its text and
// still draws its icon. Fountain icon plus one name, which is what we want.
//
// That makes the ordering load-bearing rather than incidental, so it is asserted here.
describe('water-area labels outrank POI labels for the same feature', () => {
	const style = osm({ theme: 'colorful' });
	const indexOf = (id: string): number => style.layers.findIndex((l) => l.id === id);
	const poiLayers = style.layers.filter((l) => (l as { 'source-layer'?: string })['source-layer'] === 'pois');

	it('places every water-area label after every POI layer', () => {
		const lastPoi = Math.max(...poiLayers.map((l) => indexOf(l.id)));
		for (const l of style.layers.filter((l) => l.id.startsWith('label-water-area')))
			expect(indexOf(l.id), `${l.id} must be emitted after the POI band`).toBeGreaterThan(lastPoi);
	});

	it('keeps POI text optional, so a POI losing the name still draws its icon', () => {
		for (const l of poiLayers)
			expect((l as { layout?: Record<string, unknown> }).layout?.['text-optional'], `${l.id}`).toBe(true);
	});

	// The smallest bucket covers `way_area` up to 1e5 with no lower bound, and it must stay: the
	// `pois` source-layer carries no `natural`/`water` field (see SHORTBREAD_SCHEMA), so a pond
	// tagged `natural=water` has no POI representation at all. Dropping the bucket because POIs
	// "already cover features that size" would leave every small named water body unlabelled —
	// the overlap with POIs is a subset, not a superset.
	it('still labels small water bodies, which no POI layer can cover', () => {
		expect(indexOf('label-water-area-small')).toBeGreaterThan(-1);
	});
});

import { describe, expect, it } from 'vitest';
import type { StyleSpecification } from '../types/index.js';
import { addLandcover } from './landcover.js';
import { osm } from '../api/osm.js';

// Build a fill layer with an optional fill-opacity (number or interpolate expression).
function fill(id: string, opacity?: unknown): Record<string, unknown> {
	return {
		id,
		type: 'fill',
		source: 'osm',
		'source-layer': 'land',
		...(opacity !== undefined ? { paint: { 'fill-opacity': opacity } } : { paint: {} }),
	};
}

const fade = (z0: number, z1: number, v: number) => ['interpolate', ['linear'], ['zoom'], z0, 0, z1, v];

function makeStyle(): StyleSpecification {
	return {
		version: 8,
		sources: {},
		layers: [
			{ id: 'background', type: 'background', paint: { 'background-color': '#fff' } },
			// landcover layers (carry ESA kinds) — all faded in by zoom
			fill('land-forest', fade(7, 8, 0.1)),
			fill('land-grass', fade(11, 12, 1)),
			fill('land-vegetation', fade(11, 12, 1)),
			fill('land-agriculture', fade(10, 11, 1)),
			fill('land-residential', fade(10, 11, 1)),
			fill('water-area', fade(4, 6, 1)),
			// NOT landcover kinds — must be left alone
			fill('land-commercial', fade(10, 11, 1)),
			fill('land-sand'), // natural kind but no fade (already visible) and not in the set
			{ id: 'water', type: 'fill', source: 'osm', 'source-layer': 'water', paint: {} },
			{ id: 'building', type: 'fill', source: 'osm', 'source-layer': 'buildings', paint: {} },
			{ id: 'road', type: 'line', source: 'osm', 'source-layer': 'streets' },
		],
	} as unknown as StyleSpecification;
}

const op = (style: StyleSpecification, id: string): unknown =>
	(style.layers.find((l) => l.id === id) as { paint?: Record<string, unknown> } | undefined)?.paint?.['fill-opacity'];

describe('addLandcover', () => {
	it('mutates the style in place and returns nothing', () => {
		const style = makeStyle();
		const ret = addLandcover(style);
		expect(ret).toBeUndefined();
		expect(op(style, 'land-grass')).not.toEqual(fade(11, 12, 1)); // changed in place
	});

	it('collapses each landcover layer’s zoom fade to its faded-in (max) opacity', () => {
		const style = makeStyle();
		addLandcover(style);
		expect(op(style, 'land-forest')).toBe(0.1);
		expect(op(style, 'land-grass')).toBe(1);
		expect(op(style, 'land-vegetation')).toBe(1);
		expect(op(style, 'land-agriculture')).toBe(1);
		expect(op(style, 'land-residential')).toBe(1);
		expect(op(style, 'water-area')).toBe(1);
	});

	it('leaves non-landcover fills untouched', () => {
		const style = makeStyle();
		addLandcover(style);
		// land-commercial is not an ESA landcover kind → keep its fade-in
		expect(op(style, 'land-commercial')).toEqual(fade(10, 11, 1));
		// generic water / buildings carry no landcover data
		expect(op(style, 'water')).toBeUndefined();
		expect(op(style, 'building')).toBeUndefined();
	});

	it('preserves a constant opacity on a landcover layer', () => {
		const style = makeStyle();
		(style.layers.find((l) => l.id === 'land-forest') as { paint: Record<string, unknown> }).paint['fill-opacity'] =
			0.6;
		addLandcover(style);
		expect(op(style, 'land-forest')).toBe(0.6);
	});

	it('uses the maximum stop value, not the last one', () => {
		const style = makeStyle();
		// peak opacity in the middle, then taper off at high zoom
		(style.layers.find((l) => l.id === 'land-grass') as { paint: Record<string, unknown> }).paint['fill-opacity'] = [
			'interpolate',
			['linear'],
			['zoom'],
			8,
			0,
			12,
			1,
			16,
			0.5,
		];
		addLandcover(style);
		expect(op(style, 'land-grass')).toBe(1);
	});

	it('defaults to fully opaque when a landcover layer has no fill-opacity', () => {
		const style = makeStyle();
		(style.layers.find((l) => l.id === 'land-residential') as { paint: Record<string, unknown> }).paint = {};
		addLandcover(style);
		expect(op(style, 'land-residential')).toBe(1);
	});

	it('ignores a non-fill layer even if its id matches', () => {
		const style = makeStyle();
		style.layers.push({ id: 'land-forest', type: 'line', source: 'osm', 'source-layer': 'land' } as never);
		addLandcover(style);
		const lineLayer = style.layers.find((l) => l.id === 'land-forest' && l.type === 'line');
		expect((lineLayer as { paint?: unknown }).paint).toBeUndefined();
	});

	// ── integration through osm() ──────────────────────────────────────────────────

	it('makes low-zoom landcover visible in a generated style without changing high zoom', () => {
		const base = osm({ theme: 'colorful' });
		const lc = osm({ theme: 'colorful', features: { landcover: true } });
		const get = (s: StyleSpecification, id: string) => op(s, id);

		// forest: was hidden below z7 ({7:0,8:0.1}); now a constant 0.1 → visible at all zooms,
		// and its high-zoom value (0.1) is unchanged.
		expect(get(base, 'land-forest')).toEqual(['interpolate', ['linear'], ['zoom'], 7, 0, 8, 0.1]);
		expect(get(lc, 'land-forest')).toBe(0.1);

		// water now renders from z0 instead of fading in at z4–6.
		expect(get(lc, 'water-area')).toBe(1);

		// a non-landcover urban fill keeps its fade-in.
		expect(get(lc, 'land-commercial')).toEqual(get(base, 'land-commercial'));
	});
});

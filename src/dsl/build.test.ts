import { describe, expect, it } from 'vitest';
import * as b from './build.js';
import { Color } from '../color/index.js';
import { resolveLayerGroups } from '../options/layer-groups.js';
import type { MaplibreLayer } from '../types/index.js';

// Unit tests for the layer-generation engine (build.ts). The value-processing internals
// (processColor / processFont / processZoomStops / processExpression / applyProps) are private,
// so they are exercised through the public builders (b.fill/line/symbol/…); the group-gating
// internals (layerOpt / scaleOpacity / scaleLayerOpacity) through b.gate. Previously build.ts
// was only covered incidentally by full-style builds.

const paintOf = (t: b.TaggedLayer) => (t.layer as { paint?: Record<string, unknown> }).paint ?? {};
const layoutOf = (t: b.TaggedLayer) => (t.layer as { layout?: Record<string, unknown> }).layout ?? {};

// ── builders: structure ──────────────────────────────────────────────────────────

describe('builders — layer structure', () => {
	it('fill sets id, type, source-layer and returns a TaggedLayer', () => {
		const t = b.fill('x', { sourceLayer: 'land', color: '#ff0000' });
		expect(t.layer.id).toBe('x');
		expect(t.layer.type).toBe('fill');
		expect((t.layer as Record<string, unknown>)['source-layer']).toBe('land');
	});

	it('passes group through untouched', () => {
		expect(b.fill('x', { sourceLayer: 'land', color: '#000', group: 'sites' }).group).toBe('sites');
	});

	it('minzoom / maxzoom land on the layer (not paint/layout); filter & layout pass through', () => {
		const layer = b.symbol('s', {
			sourceLayer: 'pois',
			minzoom: 5,
			maxzoom: 10,
			filter: ['==', ['get', 'k'], 1],
			layout: { 'symbol-spacing': 50 },
		}).layer as Record<string, unknown>;
		expect(layer.minzoom).toBe(5);
		expect(layer.maxzoom).toBe(10);
		expect(layer.filter).toStrictEqual(['==', ['get', 'k'], 1]);
		expect((layer.layout as Record<string, unknown>)['symbol-spacing']).toBe(50);
	});

	it('slot() is an invisible background anchor with no source', () => {
		const t = b.slot('slot-x');
		expect(t.layer).toStrictEqual({ id: 'slot-x', type: 'background', paint: { 'background-opacity': 0 } });
		expect(t.group).toBeUndefined();
	});
});

// ── builders: value processing ─────────────────────────────────────────────────────

describe('builders — color processing', () => {
	it('parses a color string to a MapLibre color string', () => {
		expect(paintOf(b.fill('x', { sourceLayer: 'land', color: '#ff0000' }))['fill-color']).toBe('rgb(255,0,0)');
	});

	it('accepts a Color instance', () => {
		expect(paintOf(b.fill('x', { sourceLayer: 'land', color: Color.parse('#00ff00') }))['fill-color']).toBe(
			'rgb(0,255,0)'
		);
	});

	it('maps color zoom-stops to an interpolate expression, parsing each stop color', () => {
		// `color` is typed as a single Color|string; zoom-stops are handled at runtime by
		// processExpression, so we cast to exercise that branch.
		const color = { 8: '#000000', 12: '#ffffff' } as unknown as string;
		expect(paintOf(b.fill('x', { sourceLayer: 'land', color }))['fill-color']).toStrictEqual([
			'interpolate',
			['linear'],
			['zoom'],
			8,
			'rgb(0,0,0)',
			12,
			'rgb(255,255,255)',
		]);
	});

	it('fillOutlineColor (a non-shorthand color key) is parsed too', () => {
		expect(
			paintOf(b.fill('x', { sourceLayer: 'land', color: '#000', fillOutlineColor: '#ff0000' }))['fill-outline-color']
		).toBe('rgb(255,0,0)');
	});
});

describe('builders — size / zoom-stops processing', () => {
	it('a scalar size passes through', () => {
		expect(paintOf(b.line('x', { sourceLayer: 'streets', color: '#000', size: 3 }))['line-width']).toBe(3);
	});

	it('linear zoom-stops become a linear interpolate expression (zooms sorted)', () => {
		expect(
			paintOf(b.line('x', { sourceLayer: 'streets', color: '#000', size: { 16: 8, 10: 1 } }))['line-width']
		).toStrictEqual(['interpolate', ['linear'], ['zoom'], 10, 1, 16, 8]);
	});

	it('ExpStops become an exponential interpolate expression', () => {
		expect(
			paintOf(b.line('x', { sourceLayer: 'streets', color: '#000', size: { base: 1.2, stops: { 10: 1, 16: 8 } } }))[
				'line-width'
			]
		).toStrictEqual(['interpolate', ['exponential', 1.2], ['zoom'], 10, 1, 16, 8]);
	});

	it('fractional zoom stops are preserved (parseFloat, not truncated)', () => {
		expect(
			paintOf(b.line('x', { sourceLayer: 'streets', color: '#000', size: { 6.5: 1, 13.5: 4 } }))['line-width']
		).toStrictEqual(['interpolate', ['linear'], ['zoom'], 6.5, 1, 13.5, 4]);
	});
});

describe('builders — font & dispatch', () => {
	it('font is wrapped in an array (text-font)', () => {
		expect(layoutOf(b.symbol('s', { sourceLayer: 'pois', font: 'noto_sans_regular' }))['text-font']).toStrictEqual([
			'noto_sans_regular',
		]);
	});

	it('symbol `color` writes BOTH icon-color and text-color', () => {
		expect(paintOf(b.symbol('s', { sourceLayer: 'pois', color: '#123456' }))).toStrictEqual({
			'icon-color': 'rgb(18,52,86)',
			'text-color': 'rgb(18,52,86)',
		});
	});

	it('symbol `opacity` writes BOTH icon-opacity and text-opacity', () => {
		expect(paintOf(b.symbol('s', { sourceLayer: 'pois', opacity: 0.5 }))).toStrictEqual({
			'icon-opacity': 0.5,
			'text-opacity': 0.5,
		});
	});

	it('keys with no mapping for the layer type are silently ignored', () => {
		// iconSize is a symbol-only key; on a fill it maps to nothing → no layout created.
		const layer = b.fill('x', { sourceLayer: 'land', color: '#000', iconSize: 2 as never }).layer as Record<
			string,
			unknown
		>;
		expect(layer.layout).toBeUndefined();
	});
});

// ── fadeIn + appear ────────────────────────────────────────────────────────────────

describe('fadeIn()', () => {
	it('ramps 0 → 1 over appear → appear+1 by default', () => {
		expect(b.fadeIn(14)).toStrictEqual({ 14: 0, 15: 1 });
	});
	it('honours a custom target', () => {
		expect(b.fadeIn(14, 0.8)).toStrictEqual({ 14: 0, 15: 0.8 });
	});
	it('honours a custom span', () => {
		expect(b.fadeIn(6, 1, 2)).toStrictEqual({ 6: 0, 8: 1 });
	});
});

describe('appear → fade-in opacity', () => {
	it('turns `appear` into a 0→1 opacity ramp', () => {
		expect(paintOf(b.fill('x', { sourceLayer: 'land', color: '#000', appear: 14 }))['fill-opacity']).toStrictEqual([
			'interpolate',
			['linear'],
			['zoom'],
			14,
			0,
			15,
			1,
		]);
	});

	it('uses a constant `opacity` as the fade target', () => {
		expect(
			paintOf(b.fill('x', { sourceLayer: 'land', color: '#000', appear: 14, opacity: 0.8 }))['fill-opacity']
		).toStrictEqual(['interpolate', ['linear'], ['zoom'], 14, 0, 15, 0.8]);
	});

	it('throws when `appear` is combined with a zoom-stops `opacity`', () => {
		expect(() => b.fill('x', { sourceLayer: 'land', color: '#000', appear: 14, opacity: { 14: 0, 16: 1 } })).toThrow(
			/combines `appear` with a zoom-stops `opacity`/
		);
	});
});

// ── gate: visibility + opacity scaling ──────────────────────────────────────────────

describe('gate()', () => {
	const fillLayer = (id: string, paint: Record<string, unknown> = {}): MaplibreLayer =>
		({ id, type: 'fill', paint }) as unknown as MaplibreLayer;

	it('drops hidden groups, keeps visible & untagged ones', () => {
		const groups = resolveLayerGroups({ buildings: false });
		const tagged: b.TaggedLayer[] = [
			{ layer: fillLayer('b'), group: 'buildings' }, // hidden → dropped
			{ layer: fillLayer('w'), group: 'water.ocean' }, // visible
			{ layer: fillLayer('u') }, // untagged → passthrough
		];
		expect([...b.gate(groups, tagged)].map((t) => t.layer.id)).toStrictEqual(['w', 'u']);
	});

	it('scales an existing fade by a fractional group opacity', () => {
		const groups = resolveLayerGroups({ water: 0.5 });
		const layer = fillLayer('w', { 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0, 6, 1] });
		const [out] = [...b.gate(groups, [{ layer, group: 'water.ocean' }])];
		expect((out.layer as { paint: Record<string, unknown> }).paint['fill-opacity']).toStrictEqual([
			'interpolate',
			['linear'],
			['zoom'],
			5,
			0,
			6,
			0.5,
		]);
	});

	it('treats an absent opacity as fully opaque (→ the factor) when dimming', () => {
		const groups = resolveLayerGroups({ sites: 0.3 });
		const [out] = [...b.gate(groups, [{ layer: fillLayer('s'), group: 'sites' }])];
		expect((out.layer as { paint: Record<string, unknown> }).paint['fill-opacity']).toBe(0.3);
	});

	it('wraps a non-interpolate opacity expression in a multiply', () => {
		const groups = resolveLayerGroups({ sites: 0.3 });
		const layer = fillLayer('e', { 'fill-opacity': ['case', ['get', 'x'], 1, 0] });
		const [out] = [...b.gate(groups, [{ layer, group: 'sites' }])];
		expect((out.layer as { paint: Record<string, unknown> }).paint['fill-opacity']).toStrictEqual([
			'*',
			['case', ['get', 'x'], 1, 0],
			0.3,
		]);
	});

	it('scales both symbol opacity props (text + icon)', () => {
		const groups = resolveLayerGroups({ pois: 0.5 });
		const layer = {
			id: 'p',
			type: 'symbol',
			paint: { 'text-opacity': 1, 'icon-opacity': 0.8 },
		} as unknown as MaplibreLayer;
		const [out] = [...b.gate(groups, [{ layer, group: 'pois' }])];
		const p = (out.layer as { paint: Record<string, unknown> }).paint;
		expect(p['text-opacity']).toBe(0.5);
		expect(p['icon-opacity']).toBe(0.4);
	});

	it('a broken group path resolves to visible (passthrough, unscaled)', () => {
		// "roads.motorways" is a boolean leaf; ".foo" beyond it can't resolve → treated as visible.
		const groups = resolveLayerGroups();
		const layer = fillLayer('x', { 'fill-opacity': 1 });
		const [out] = [...b.gate(groups, [{ layer, group: 'roads.motorways.foo' }])];
		expect(out.layer.id).toBe('x');
		expect((out.layer as { paint: Record<string, unknown> }).paint['fill-opacity']).toBe(1); // unchanged
	});
});

import { describe, expect, it } from 'vitest';
import { hardBounds, isolateLayer, landcoverAlone, withoutPatterns, withoutSymbols, withSameTiles } from './measure.js';
import type { StyleSpecification } from '../../src/types/index.js';

const ramp = (...stops: number[]) => ['interpolate', ['linear'], ['zoom'], ...stops];
const style = (...layers: object[]) => ({ version: 8, sources: {}, layers }) as unknown as StyleSpecification;
const ids = (s: StyleSpecification) => s.layers.map((layer) => layer.id);

describe('layer sets', () => {
	const layers = style(
		{ id: 'background', type: 'background' },
		{ id: 'fill', type: 'fill', source: 's' },
		{ id: 'label', type: 'symbol', source: 's' }
	);

	it('withoutSymbols drops only the symbols', () => {
		expect(ids(withoutSymbols(layers))).toStrictEqual(['background', 'fill']);
	});

	it('withoutPatterns drops the dashed and patterned layers', () => {
		const patterned = style(
			{ id: 'background', type: 'background' },
			{ id: 'solid', type: 'line', source: 's', paint: { 'line-width': 1 } },
			{ id: 'dashed', type: 'line', source: 's', paint: { 'line-dasharray': [2, 1] } },
			{ id: 'image', type: 'line', source: 's', paint: { 'line-pattern': 'x' } },
			{ id: 'hatched', type: 'fill', source: 's', paint: { 'fill-pattern': 'x' } },
			{ id: 'label', type: 'symbol', source: 's' }
		);
		expect(ids(withoutPatterns(patterned))).toStrictEqual(['background', 'solid', 'label']);
	});

	it('landcoverAlone keeps the background and the land cover fills', () => {
		const withLandcover = style(
			{ id: 'background', type: 'background' },
			{ id: 'landcover-land-forest', type: 'fill', source: 'l' },
			{ id: 'land-forest', type: 'fill', source: 's' }
		);
		expect(ids(landcoverAlone(withLandcover))).toStrictEqual(['background', 'landcover-land-forest']);
	});

	it('isolateLayer keeps the background and the one layer', () => {
		expect(ids(isolateLayer(layers, 'label'))).toStrictEqual(['background', 'label']);
	});
});

describe('withSameTiles', () => {
	const sources = (maxzoom?: number) =>
		({
			version: 8,
			sources: {
				vector: { type: 'vector', tiles: ['x'], ...(maxzoom !== undefined && { maxzoom }) },
				dem: { type: 'raster-dem', tiles: ['y'], maxzoom: 12 },
			},
			layers: [],
		}) as unknown as StyleSpecification;

	it('ends a vector source one zoom below the boundary', () => {
		expect(withSameTiles(sources(14), 11).sources['vector']).toMatchObject({ maxzoom: 10 });
		expect(withSameTiles(sources(), 11).sources['vector']).toMatchObject({ maxzoom: 10 });
	});

	it('leaves a source alone that ends below that anyway', () => {
		expect(withSameTiles(sources(14), 17).sources['vector']).toMatchObject({ maxzoom: 14 });
	});

	it('touches only vector sources, and not the style it was given', () => {
		const before = sources(14);
		expect(withSameTiles(before, 11).sources['dem']).toMatchObject({ maxzoom: 12 });
		expect(before.sources['vector']).toMatchObject({ maxzoom: 14 });
	});
});

describe('hardBounds', () => {
	const bounds = (layer: object) => hardBounds(style({ id: 'x', type: 'line', ...layer }));

	it('finds a layer that starts at its minzoom with no ramp at all', () => {
		expect(bounds({ minzoom: 9 })).toStrictEqual([{ id: 'x', type: 'line', bound: 'minzoom', zoom: 9 }]);
	});

	it('finds a ramp that does not start from 0', () => {
		expect(bounds({ minzoom: 9, paint: { 'line-width': ramp(10, 0.8, 20, 6) } })).toHaveLength(1);
	});

	it('accepts a ramp from 0 at the minzoom', () => {
		expect(bounds({ minzoom: 9, paint: { 'line-opacity': ramp(9, 0, 10, 1) } })).toStrictEqual([]);
	});

	it('accepts a ramp from 0 after the minzoom, which draws nothing until then', () => {
		expect(bounds({ minzoom: 14, paint: { 'line-opacity': ramp(15, 0, 16, 1) } })).toStrictEqual([]);
	});

	it('does not take a line growing from width 0 for a smooth start: it pops in just above 0', () => {
		expect(bounds({ minzoom: 9, paint: { 'line-width': ramp(9, 0, 10, 1) } })).toHaveLength(1);
	});

	it('finds a ramp from 0 before the minzoom, already past 0 by then', () => {
		expect(bounds({ minzoom: 9, paint: { 'line-opacity': ramp(8, 0, 9, 1) } })).toHaveLength(1);
	});

	it('reads layout properties too', () => {
		const layer = { type: 'symbol', minzoom: 9, layout: { 'text-size': ramp(9, 0, 10, 12) } };
		expect(bounds(layer)).toStrictEqual([]);
	});

	it('only reads the properties that make a layer of that type vanish', () => {
		expect(bounds({ minzoom: 9, paint: { 'fill-opacity': ramp(9, 0, 10, 1) } })).toHaveLength(1);
	});

	it('finds a maxzoom no ramp reaches 0 by, and accepts one that does', () => {
		expect(bounds({ maxzoom: 9 })).toStrictEqual([{ id: 'x', type: 'line', bound: 'maxzoom', zoom: 9 }]);
		expect(bounds({ maxzoom: 9, paint: { 'line-opacity': ramp(8, 1, 9, 0) } })).toStrictEqual([]);
		expect(bounds({ maxzoom: 9, paint: { 'line-opacity': ramp(9, 1, 10, 0) } })).toHaveLength(1);
	});

	it('ignores a layer without zoom bounds, and a minzoom of 0', () => {
		expect(bounds({})).toStrictEqual([]);
		expect(bounds({ minzoom: 0 })).toStrictEqual([]);
	});
});

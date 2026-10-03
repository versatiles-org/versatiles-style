import { describe, expect, it } from 'vitest';
import { moveToLineLayerOpacity } from './opacity.js';
import type { MaplibreLayer } from '../types/index.js';

const line = (paint: Record<string, unknown>) =>
	({ id: 'l', type: 'line', source: 's', paint: { ...paint } }) as unknown as MaplibreLayer;
const paintOf = (layer: MaplibreLayer) => (layer as { paint?: Record<string, unknown> }).paint ?? {};

describe('moveToLineLayerOpacity', () => {
	it('moves a constant, scaled, and removes line-opacity', () => {
		const layer = line({ 'line-opacity': 0.5 });
		expect(moveToLineLayerOpacity(layer, 0.4)).toBe(true);
		expect(paintOf(layer)).toEqual({ 'line-layer-opacity': 0.2 });
	});

	it('treats an absent opacity as opaque', () => {
		const layer = line({});
		expect(moveToLineLayerOpacity(layer, 0.9)).toBe(true);
		expect(paintOf(layer)).toEqual({ 'line-layer-opacity': 0.9 });
	});

	it('keeps a zoom fade', () => {
		const layer = line({ 'line-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0, 8, 1] });
		expect(moveToLineLayerOpacity(layer, 0.5)).toBe(true);
		expect(paintOf(layer)).toEqual({ 'line-layer-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0, 8, 0.5] });
	});

	it('scales by a zoom curve, over the stops of both', () => {
		const layer = line({ 'line-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0, 6, 1] });
		expect(moveToLineLayerOpacity(layer, { 6: 0.5, 10: 1, 14: 0.25 })).toBe(true);
		expect(paintOf(layer)).toEqual({
			'line-layer-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0, 6, 0.5, 10, 1, 14, 0.25],
		});
	});

	it('scales a constant by a zoom curve', () => {
		const layer = line({ 'line-opacity': 0.5 });
		expect(moveToLineLayerOpacity(layer, { 8: 1, 12: 0.5 })).toBe(true);
		expect(paintOf(layer)).toEqual({
			'line-layer-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 8, 0.5, 12, 0.25],
		});
	});

	it('leaves a non-linear ramp alone when it would have to be multiplied by a curve', () => {
		const opacity = ['interpolate', ['exponential', 2], ['zoom'], 5, 0, 10, 1];
		const layer = line({ 'line-opacity': opacity });
		expect(moveToLineLayerOpacity(layer, { 8: 1, 12: 0.5 })).toBe(false);
		expect(paintOf(layer)).toEqual({ 'line-opacity': opacity });
	});

	it('leaves a data-driven opacity alone, which line-layer-opacity cannot take', () => {
		const opacity = ['match', ['get', 'kind'], 'a', 0.5, 1];
		const layer = line({ 'line-opacity': opacity });
		expect(moveToLineLayerOpacity(layer, 0.5)).toBe(false);
		expect(paintOf(layer)).toEqual({ 'line-opacity': opacity });
	});

	it('ignores a layer that is not a line', () => {
		const layer = { id: 'f', type: 'fill', source: 's', paint: { 'fill-opacity': 0.5 } } as unknown as MaplibreLayer;
		expect(moveToLineLayerOpacity(layer, 0.5)).toBe(false);
		expect(paintOf(layer)).toEqual({ 'fill-opacity': 0.5 });
	});
});

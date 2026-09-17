import { describe, expect, it } from 'vitest';
import { inspectorStyle } from './inspectorStyle.js';
import { guessStyle } from './guessStyle.js';
import type { StyleSpecification } from '../types/index.js';

const vectorTJ = {
	tilejson: '3.0.0',
	tiles: ['https://example.org/{z}/{x}/{y}.pbf'],
	vector_layers: [{ id: 'rivers' }, { id: 'parcels' }],
};

const ids = (style: StyleSpecification): string[] => style.layers.map((l) => `${l.type}:${l.id}`);

describe('inspectorStyle()', () => {
	it('draws a fill, a line and a label for every source-layer, over a background', () => {
		expect(ids(inspectorStyle(vectorTJ as never))).toEqual([
			'background:background',
			'fill:rivers-fill',
			'line:rivers-line',
			'symbol:rivers-label',
			'fill:parcels-fill',
			'line:parcels-line',
			'symbol:parcels-label',
		]);
	});

	it('filters nothing, so geometry shows up whichever type it turns out to be', () => {
		for (const layer of inspectorStyle(vectorTJ as never).layers) {
			expect((layer as { filter?: unknown }).filter, layer.id).toBeUndefined();
		}
	});

	it('is synchronous and does no I/O', () => {
		expect(inspectorStyle(vectorTJ as never)).not.toBeInstanceOf(Promise);
	});

	it('gives each source-layer one hue, stable across calls and across tilesets', () => {
		const paintOf = (style: StyleSpecification, id: string) =>
			(style.layers.find((l) => l.id === id) as { paint?: Record<string, unknown> }).paint;

		const a = inspectorStyle(vectorTJ as never);
		const b = inspectorStyle({ ...vectorTJ, vector_layers: [{ id: 'rivers' }] } as never);
		// Keyed on the source-layer *name*, so two tilesets can be compared side by side.
		expect(paintOf(a, 'rivers-fill')).toEqual(paintOf(b, 'rivers-fill'));
		expect(paintOf(a, 'rivers-fill')).not.toEqual(paintOf(a, 'parcels-fill'));
		// The line is the darker shade of the same hue as its fill.
		const hue = (c: string) => /hsl\((\d+)/.exec(c)?.[1];
		expect(hue((paintOf(a, 'rivers-line') as { 'line-color': string })['line-color'])).toBe(
			hue((paintOf(a, 'rivers-fill') as { 'fill-color': string })['fill-color'])
		);
	});

	it('carries the tileset’s own zoom range, bounds and attribution onto the source', () => {
		const style = inspectorStyle({
			...vectorTJ,
			minzoom: 2,
			maxzoom: 11,
			bounds: [-10, -10, 10, 10],
			attribution: '© Example',
		} as never);
		expect(style.sources.tiles).toMatchObject({
			type: 'vector',
			minzoom: 2,
			maxzoom: 11,
			bounds: [-10, -10, 10, 10],
			attribution: '© Example',
		});
	});

	it('resolves relative tiles against urls.base and takes glyphs from urls.glyphsPattern', () => {
		const style = inspectorStyle({ ...vectorTJ, tiles: ['/t/{z}/{x}/{y}.pbf'] } as never, {
			urls: { base: 'https://tiles.example.org', glyphsPattern: 'https://f.example.org/{fontstack}/{range}.pbf' },
		});
		expect(JSON.stringify(style.sources.tiles)).toContain('https://tiles.example.org/t/');
		expect(style.glyphs).toBe('https://f.example.org/{fontstack}/{range}.pbf');
	});

	// A builder, not a guesser: you asked for this style specifically, so bad input is an error rather
	// than something to paper over. `guessStyle` is the one with the never-throws contract.
	describe('it throws rather than returning a blank style', () => {
		it('on a raster tileset, which has no named layers to inspect', () => {
			expect(() => inspectorStyle({ tilejson: '3.0.0', tiles: ['https://e.org/{z}/{x}/{y}.png'] })).toThrow(
				/expected a vector TileJSON/
			);
		});

		it('on a malformed TileJSON', () => {
			expect(() => inspectorStyle({ tiles: [] } as never)).toThrow(/TileJSON validation/);
			expect(() => inspectorStyle(null as never)).toThrow(/TileJSON validation/);
		});

		it('on an unknown option key, as every other entry point does', () => {
			expect(() => inspectorStyle(vectorTJ as never, { theme: 'colorful' } as never)).toThrow(/theme/);
			expect(() => inspectorStyle(vectorTJ as never, { urls: { sprite: 'x' } } as never)).toThrow(/sprite/);
		});
	});

	describe('its relationship to guessStyle', () => {
		it('is what guessStyle falls back to for an unrecognised vector tileset', async () => {
			expect(ids(await guessStyle(vectorTJ as never))).toEqual(ids(inspectorStyle(vectorTJ as never)));
		});

		// The reason to export it: for a tileset guessStyle *does* recognise, it builds real cartography,
		// and there was previously no way to ask for the raw source-layers instead.
		it('can be asked for directly where guessStyle would build real cartography', async () => {
			const shortbread = {
				tilejson: '3.0.0',
				tiles: ['https://example.org/{z}/{x}/{y}.pbf'],
				vector_layers: [{ id: 'water_polygons' }, { id: 'streets' }, { id: 'buildings' }, { id: 'place_labels' }],
			};
			const guessed = await guessStyle(shortbread as never);
			const inspected = inspectorStyle(shortbread as never);

			expect(guessed.layers.length).toBeGreaterThan(200); // the real Shortbread style
			expect(inspected.layers.length).toBe(shortbread.vector_layers.length * 3 + 1);
			expect(Object.keys(inspected.sources)).toEqual(['tiles']);
		});

		// `guessStyle`'s `urls` also carries `sprite`, which `inspectorStyle` rejects as unknown. Since
		// `guessStyle` never throws, passing it through unfiltered turned the fallback into a *blank*
		// style — worse than the error it was hiding.
		it('still returns an inspector style when guessStyle was given a sprite url', async () => {
			const style = await guessStyle(vectorTJ as never, { urls: { sprite: 'https://example.org/sprite' } });
			expect(ids(style)).toEqual(ids(inspectorStyle(vectorTJ as never)));
		});
	});
});

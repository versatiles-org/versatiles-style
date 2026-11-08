import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { guessSchema, guessStyle, inlineSources, osm, satellite } from '../index.js';
import { tileJSONFetch } from '../lib/load-tile-source.test.js';
import type { StyleSpecification, TileJSONSpecification } from '../types/index.js';

// What the library does with the TileJSONs tiles.versatiles.org actually serves. `tilejson.test.ts`
// only checks that they validate; these check that each tileset gets the style it should. The fixtures
// are copies of the live documents, so they go stale — but a stale one that changes behaviour fails here.

const BASE = 'https://tiles.versatiles.org';

function fixture(name: string): TileJSONSpecification {
	const file = join(import.meta.dirname, '../types/fixtures/tilejson', `${name}.json`);
	return JSON.parse(readFileSync(file, 'utf8')) as TileJSONSpecification;
}

const guess = (name: string) => guessStyle(fixture(name), { urls: { base: BASE } });
const layerTypes = (style: StyleSpecification) => [...new Set(style.layers.map((l) => l.type))].sort();

describe('VersaTiles tilesets', () => {
	describe('osm-vector', () => {
		it('is recognised as Shortbread and gets the osm() style', async () => {
			expect(guessSchema(fixture('osm-vector'))).toMatchObject({ type: 'vector', schema: 'shortbread' });
			const style = await guess('osm-vector');
			expect(Object.keys(style.sources)).toStrictEqual(['versatiles-shortbread']);
			expect(style.sources['versatiles-shortbread']).toMatchObject({ tiles: [`${BASE}/tiles/osm-vector/{z}/{x}/{y}`] });
		});

		it('has no land cover layer, so it cannot back features.landcover on its own', () => {
			expect(osm.supportsLandcover(fixture('osm-vector'))).toBe(false);
		});

		it('lists its name languages', () => {
			expect(osm.languages(fixture('osm-vector'))).toEqual(expect.arrayContaining(['de', 'en']));
		});

		// The README's reason `inlineSources` is required: the server lists root-relative tile URLs.
		it('is referenced by osm() and resolved to absolute tile URLs by inlineSources', async () => {
			const url = `${BASE}/tiles/osm-vector/tiles.json`;
			const style = osm({ urls: { osm: url } });
			expect(style.sources['versatiles-shortbread']).toMatchObject({ url });

			const inlined = await inlineSources(style, { fetch: tileJSONFetch({ [url]: fixture('osm-vector') }) });
			const source = inlined.sources['versatiles-shortbread'];
			expect(source).toMatchObject({ tiles: [`${BASE}/tiles/osm-vector/{z}/{x}/{y}`] });
			expect(source).not.toHaveProperty('url');
		});
	});

	describe('landcover-vector', () => {
		it('can back features.landcover', () => {
			expect(osm.supportsLandcover(fixture('landcover-vector'))).toBe(true);
		});

		it('is recognised, and gets the inspector style on its own', async () => {
			expect(guessSchema(fixture('landcover-vector'))).toMatchObject({ type: 'vector', schema: 'landcover' });
			const style = await guess('landcover-vector');
			expect(Object.keys(style.sources)).toStrictEqual(['tiles']);
		});

		it('is referenced by default and resolved to absolute tile URLs by inlineSources', async () => {
			const url = `${BASE}/tiles/landcover-vector/tiles.json`;
			const osmUrl = `${BASE}/tiles/osm-vector/tiles.json`;
			const style = osm({ features: { landcover: true }, urls: { base: BASE } });
			expect(style.sources['versatiles-landcover']).toStrictEqual({ type: 'vector', url });

			const fetch = tileJSONFetch({ [url]: fixture('landcover-vector'), [osmUrl]: fixture('osm-vector') });
			const inlined = await inlineSources(style, { fetch });
			expect(inlined.sources['versatiles-landcover']).toMatchObject({
				tiles: [`${BASE}/tiles/landcover-vector/{z}/{x}/{y}`],
				maxzoom: 10,
			});
		});
	});

	describe('elevation-raster', () => {
		it('gets a hillshade on 3D terrain, decoded as Terrarium', async () => {
			const style = await guess('elevation-raster');
			expect(layerTypes(style)).toStrictEqual(['background', 'hillshade']);
			expect(style.terrain).toMatchObject({ source: 'elevation-terrain' });
			for (const id of ['elevation', 'elevation-terrain']) {
				expect(style.sources[id], id).toMatchObject({
					type: 'raster-dem',
					encoding: 'terrarium',
					tiles: [`${BASE}/tiles/elevation-raster/{z}/{x}/{y}`],
				});
			}
		});

		it('is decoded as Terrarium once inlined into a terrain style', async () => {
			const url = `${BASE}/tiles/elevation-raster/tiles.json`;
			const style = osm({ features: { terrain: true }, urls: { elevation: url } });
			const inlined = await inlineSources(style, { fetch: tileJSONFetch({ [url]: fixture('elevation-raster') }) });
			expect(inlined.sources['elevation']).toMatchObject({ encoding: 'terrarium' });
		});
	});

	describe('satellite-raster', () => {
		it('gets the satellite() style', async () => {
			const style = await guess('satellite-raster');
			expect(style.sources['satellite']).toMatchObject({
				type: 'raster',
				tiles: [`${BASE}/tiles/satellite-raster/{z}/{x}/{y}`],
			});
		});

		// The server quotes this attribution with single quotes, unlike the others.
		it('has its attribution normalised to double quotes', () => {
			const style = satellite({
				urls: { satellite: { ...fixture('satellite-raster'), tiles: ['https://s/{z}/{x}/{y}'] } },
			});
			expect(style.sources['satellite']).toMatchObject({
				attribution: '<a href="https://versatiles.org/sources/">VersaTiles sources</a>',
			});
		});
	});

	// Neither has a schema this library styles, so both get the inspector style.
	describe.each(['hillshade-vector', 'bathymetry-vector'])('%s', (name) => {
		it('gets the inspector style', async () => {
			expect(guessSchema(fixture(name))).toMatchObject({ type: 'vector', schema: undefined });
			const style = await guess(name);
			expect(Object.keys(style.sources)).toStrictEqual(['tiles']);
			expect(style.sources['tiles']).toMatchObject({ tiles: [`${BASE}/tiles/${name}/{z}/{x}/{y}`] });
		});
	});
});

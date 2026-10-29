import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { guessSchema, guessStyle, inlineSources, osm, satellite } from '../index.js';
import { tileJSONFetch } from '../lib/load-tile-source.test.js';
import type { StyleSpecification, TileJSONSpecification } from '../types/index.js';

// What the library does with the TileJSONs tiles.versatiles.org actually serves. `tilejson.test.ts`
// only checks that they validate; these check that each tileset gets the style it should. The fixtures
// are copies of the live documents (landcover-vectors from its published container, which the server
// does not serve on its own), so they go stale — but a stale one that changes behaviour fails here.

const BASE = 'https://tiles.versatiles.org';

function fixture(name: string): TileJSONSpecification {
	const file = join(import.meta.dirname, '../types/fixtures/tilejson', `${name}.json`);
	return JSON.parse(readFileSync(file, 'utf8')) as TileJSONSpecification;
}

const guess = (name: string) => guessStyle(fixture(name), { urls: { base: BASE } });
const layerTypes = (style: StyleSpecification) => [...new Set(style.layers.map((l) => l.type))].sort();

describe('VersaTiles tilesets', () => {
	describe('osm', () => {
		it('is recognised as Shortbread and gets the osm() style', async () => {
			expect(guessSchema(fixture('osm'))).toMatchObject({ type: 'vector', schema: 'shortbread' });
			const style = await guess('osm');
			expect(Object.keys(style.sources)).toStrictEqual(['versatiles-shortbread']);
			expect(style.sources['versatiles-shortbread']).toMatchObject({ tiles: [`${BASE}/tiles/osm/{z}/{x}/{y}`] });
		});

		it('carries the merged landcover, so it can back features.landcover', () => {
			expect(osm.supportsLandcover(fixture('osm'))).toBe(true);
		});

		it('lists its name languages', () => {
			expect(osm.languages(fixture('osm'))).toEqual(expect.arrayContaining(['de', 'en']));
		});

		// The README's reason `inlineSources` is required: the server lists root-relative tile URLs.
		it('is referenced by osm() and resolved to absolute tile URLs by inlineSources', async () => {
			const url = `${BASE}/tiles/osm/tiles.json`;
			const style = osm({ urls: { osm: url } });
			expect(style.sources['versatiles-shortbread']).toMatchObject({ url });

			const inlined = await inlineSources(style, { fetch: tileJSONFetch({ [url]: fixture('osm') }) });
			const source = inlined.sources['versatiles-shortbread'];
			expect(source).toMatchObject({ tiles: [`${BASE}/tiles/osm/{z}/{x}/{y}`] });
			expect(source).not.toHaveProperty('url');
		});
	});

	describe('landcover-vectors', () => {
		it('can back features.landcover', () => {
			expect(osm.supportsLandcover(fixture('landcover-vectors'))).toBe(true);
		});
	});

	describe('elevation', () => {
		it('gets a hillshade on 3D terrain, decoded as Terrarium', async () => {
			const style = await guess('elevation');
			expect(layerTypes(style)).toStrictEqual(['background', 'hillshade']);
			expect(style.terrain).toMatchObject({ source: 'elevation-terrain' });
			for (const id of ['elevation', 'elevation-terrain']) {
				expect(style.sources[id], id).toMatchObject({
					type: 'raster-dem',
					encoding: 'terrarium',
					tiles: [`${BASE}/tiles/elevation/{z}/{x}/{y}`],
				});
			}
		});

		it('is decoded as Terrarium once inlined into a terrain style', async () => {
			const url = `${BASE}/tiles/elevation/tiles.json`;
			const style = osm({ features: { terrain: true }, urls: { elevation: url } });
			const inlined = await inlineSources(style, { fetch: tileJSONFetch({ [url]: fixture('elevation') }) });
			expect(inlined.sources['elevation']).toMatchObject({ encoding: 'terrarium' });
		});
	});

	describe('satellite', () => {
		it('gets the satellite() style', async () => {
			const style = await guess('satellite');
			expect(style.sources['satellite']).toMatchObject({
				type: 'raster',
				tiles: [`${BASE}/tiles/satellite/{z}/{x}/{y}`],
			});
		});

		// The server quotes this attribution with single quotes, unlike the others.
		it('has its attribution normalised to double quotes', () => {
			const style = satellite({ urls: { satellite: { ...fixture('satellite'), tiles: ['https://s/{z}/{x}/{y}'] } } });
			expect(style.sources['satellite']).toMatchObject({
				attribution: '<a href="https://versatiles.org/sources/">VersaTiles sources</a>',
			});
		});
	});

	// Neither has a schema this library styles, so both get the inspector style.
	describe.each(['hillshade-vectors', 'bathymetry-vectors'])('%s', (name) => {
		it('gets the inspector style', async () => {
			expect(guessSchema(fixture(name))).toMatchObject({ type: 'vector', schema: undefined });
			const style = await guess(name);
			expect(Object.keys(style.sources)).toStrictEqual(['tiles']);
			expect(style.sources['tiles']).toMatchObject({ tiles: [`${BASE}/tiles/${name}/{z}/{x}/{y}`] });
		});
	});
});

import { describe, expect, it } from 'vitest';
import { guessStyle, osm, satellite } from '../index.js';
import type { OsmOptions } from '../options/index.js';
import type { StyleSpecification, TileJSONSpecification } from '../types/index.js';

const OSM_URL = 'https://example.com/osm/tiles.json';
const LANDCOVER_URL = 'https://example.com/lc/tiles.json';

// Typed out, not derived from the implementation, so the test can disagree with it.
const EXPECTED: [id: string, kinds: string[]][] = [
	['landcover-land-glacier', ['glacier']],
	['landcover-land-residential', ['residential']],
	['landcover-land-agriculture', ['farmland']],
	['landcover-land-rock', ['bare_rock']],
	['landcover-land-forest', ['forest']],
	['landcover-land-grass', ['grassland']],
	['landcover-land-vegetation', ['heath', 'scrub']],
	['landcover-land-wetland', ['marsh', 'swamp']],
	['landcover-water-area', ['water']],
];
const OVERZOOMED = ['interpolate', ['linear'], ['zoom'], 12, 1, 14, 0.25];
const ending = (zoom: number) => ['interpolate', ['linear'], ['zoom'], zoom, 1, zoom + 1, 0];

function tileJSON(layers: { id: string; maxzoom?: number }[], maxzoom?: number): TileJSONSpecification {
	return {
		tilejson: '3.0.0',
		tiles: ['https://example.com/x/{z}/{x}/{y}'],
		...(maxzoom !== undefined && { maxzoom }),
		vector_layers: layers.map((layer) => ({ fields: { kind: 'String' }, ...layer })),
	} as TileJSONSpecification;
}
const landcoverOnly = (maxzoom?: number) => tileJSON([{ id: 'landcover', maxzoom }], maxzoom);
const mergedTileset = (landcover: number | undefined, maxzoom = 14) =>
	tileJSON([{ id: 'land' }, { id: 'landcover', maxzoom: landcover }, { id: 'streets' }], maxzoom);

const build = (options: OsmOptions = {}) => osm({ ...options, features: { landcover: true, ...options.features } });
const landcoverLayers = (style: StyleSpecification) => style.layers.filter((l) => l.id.startsWith('landcover-'));
const layer = (style: StyleSpecification, id: string) =>
	style.layers.find((l) => l.id === id) as unknown as Record<string, unknown>;
const opacity = (style: StyleSpecification, id: string): unknown =>
	(layer(style, id).paint as Record<string, unknown>)['fill-opacity'];

describe('features.landcover', () => {
	describe('the fills', () => {
		it('draws the 9 fills in stock order, in the slot: between the background and the ocean', () => {
			expect(
				build()
					.layers.map((l) => l.id)
					.slice(0, 12)
			).toStrictEqual(['background', ...EXPECTED.map(([id]) => id), 'slot-below-fills', 'water-ocean']);
		});

		it.each(EXPECTED)('%s reads only its kinds from the land cover', (id, kinds) => {
			const fill = layer(build(), id);
			expect(fill).toMatchObject({ type: 'fill', 'source-layer': 'landcover', source: 'versatiles-landcover' });
			expect(fill.filter).toStrictEqual(['in', ['get', 'kind'], ['literal', kinds]]);
			expect(fill).not.toHaveProperty('minzoom');
		});

		it('leaves every stock layer unchanged', () => {
			const stock = osm();
			const on = build();
			expect(on.layers.filter((l) => !l.id.startsWith('landcover-'))).toStrictEqual(stock.layers);
			expect(on.sources['versatiles-shortbread']).toStrictEqual(stock.sources['versatiles-shortbread']);
		});

		it('takes the colour of the stock fill, in any theme', () => {
			const style = build({ theme: 'gray-dark' });
			for (const [id] of EXPECTED) {
				const stock = id.replace('landcover-', '');
				expect(layer(style, id).paint).toHaveProperty(
					['fill-color'],
					(layer(style, stock).paint as Record<string, unknown>)['fill-color']
				);
			}
		});

		it('recolours with the stock fill', () => {
			const style = build({ recolor: { invertBrightness: true } });
			expect((layer(style, 'landcover-land-forest').paint as Record<string, unknown>)['fill-color']).toBe(
				(layer(style, 'land-forest').paint as Record<string, unknown>)['fill-color']
			);
		});

		it('scales the fade by the opacity of the group', () => {
			const style = build({ layers: { land: { forest: 0.5 } } });
			expect(opacity(style, 'landcover-land-forest')).toStrictEqual([
				'interpolate',
				['linear'],
				['zoom'],
				12,
				0.5,
				14,
				0.125,
			]);
			expect(opacity(style, 'landcover-land-grass')).toStrictEqual(OVERZOOMED);
		});

		it('hides with the group', () => {
			const ids = build({ layers: { land: { forest: false } } }).layers.map((l) => l.id);
			expect(ids).not.toContain('landcover-land-forest');
			expect(ids).toContain('landcover-land-grass');
		});

		it('asks for no source when every group is hidden', () => {
			const style = build({ layers: { land: false, water: false } });
			expect(landcoverLayers(style)).toStrictEqual([]);
			expect(style.sources).not.toHaveProperty('versatiles-landcover');
		});

		it('does not share a fade between layers', () => {
			const style = build();
			expect(opacity(style, 'landcover-land-forest')).not.toBe(opacity(style, 'landcover-land-grass'));
		});
	});

	describe('as a source of its own', () => {
		it('references the default path under the base', () => {
			const style = build({ urls: { base: 'https://example.com' } });
			expect(style.sources['versatiles-landcover']).toStrictEqual({
				type: 'vector',
				url: 'https://example.com/tiles/landcover-vector/tiles.json',
			});
		});

		it('overzooms: the fade outlasts the tiles', () => {
			const style = build();
			for (const [id] of EXPECTED) expect(opacity(style, id)).toStrictEqual(OVERZOOMED);
		});

		it('ends a {z} template at z10, so MapLibre overzooms it', () => {
			const tiles = 'https://example.com/lc/{z}/{x}/{y}';
			expect(build({ urls: { landcover: tiles } }).sources['versatiles-landcover']).toStrictEqual({
				type: 'vector',
				tiles: [tiles],
				maxzoom: 10,
			});
		});

		it('ends a TileJSON where its land cover layer says', () => {
			const style = build({ urls: { landcover: landcoverOnly(9) } });
			expect(style.sources['versatiles-landcover']).toMatchObject({ maxzoom: 9 });
			expect(opacity(style, 'landcover-land-forest')).toStrictEqual(OVERZOOMED);
		});

		it('ends a TileJSON without any zoom at z10', () => {
			const style = build({ urls: { landcover: landcoverOnly() } });
			expect(style.sources['versatiles-landcover']).toMatchObject({ maxzoom: 10 });
		});

		it('stays separate when told to, though `urls.osm` carries the land cover', () => {
			const style = build({ urls: { osm: mergedTileset(10), landcover: LANDCOVER_URL } });
			expect(style.sources['versatiles-landcover']).toStrictEqual({ type: 'vector', url: LANDCOVER_URL });
		});
	});

	describe('merged into the OSM source', () => {
		const expectMerged = (style: StyleSpecification) => {
			expect(Object.keys(style.sources)).toStrictEqual(['versatiles-shortbread']);
			expect(landcoverLayers(style)).toHaveLength(9);
			for (const fill of landcoverLayers(style)) expect(fill).toMatchObject({ source: 'versatiles-shortbread' });
		};

		it('recognises a TileJSON that carries it', () => {
			expectMerged(build({ urls: { osm: mergedTileset(10) } }));
		});

		it('recognises the same URL twice, ending at z10', () => {
			const style = build({ urls: { osm: OSM_URL, landcover: OSM_URL } });
			expectMerged(style);
			expect(opacity(style, 'landcover-land-forest')).toStrictEqual(ending(10));
		});

		it('recognises the same URL through different spellings', () => {
			expectMerged(build({ urls: { base: 'https://example.com', osm: '/osm/tiles.json', landcover: OSM_URL } }));
		});

		it('recognises equal objects, as after a round trip through JSON', () => {
			const source = mergedTileset(10);
			expectMerged(build({ urls: { osm: source, landcover: JSON.parse(JSON.stringify(source)) } }));
		});

		it('ends the fill one zoom after the last zoom vector_layers states', () => {
			const style = build({ urls: { osm: mergedTileset(8) } });
			expect(opacity(style, 'landcover-land-forest')).toStrictEqual(ending(8));
		});

		it('assumes z10 where vector_layers states none', () => {
			const style = build({ urls: { osm: mergedTileset(undefined) } });
			expect(opacity(style, 'landcover-land-forest')).toStrictEqual(ending(10));
		});

		it('overzooms a land cover that reaches the last zoom of the source', () => {
			const style = build({ urls: { osm: mergedTileset(14, 14) } });
			expect(opacity(style, 'landcover-land-forest')).toStrictEqual(OVERZOOMED);
		});

		it('scales the ending fade by the opacity of the group', () => {
			const style = build({ urls: { osm: mergedTileset(10) }, layers: { land: { forest: 0.5 } } });
			expect(opacity(style, 'landcover-land-forest')).toStrictEqual([
				'interpolate',
				['linear'],
				['zoom'],
				10,
				0.5,
				11,
				0,
			]);
		});

		it('draws nothing of a merged tileset unless the feature is on', () => {
			const style = osm({ urls: { osm: mergedTileset(10) } });
			expect(landcoverLayers(style)).toStrictEqual([]);
		});
	});

	describe('guessStyle', () => {
		const SHORTBREAD = ['land', 'water_polygons', 'ocean', 'streets', 'buildings', 'place_labels', 'pois', 'sites'];
		const shortbread = (...extra: { id: string; maxzoom?: number }[]) =>
			tileJSON([...SHORTBREAD.map((id) => ({ id })), ...extra], 14);

		it('draws the land cover of a merged tileset', async () => {
			const style = await guessStyle(shortbread({ id: 'landcover', maxzoom: 10 }), {
				urls: { base: 'https://example.com' },
			});
			expect(landcoverLayers(style)).toHaveLength(9);
			expect(opacity(style, 'landcover-land-forest')).toStrictEqual(ending(10));
		});

		it('reads the last zoom from a merged tileset behind a URL', async () => {
			const document = shortbread({ id: 'landcover', maxzoom: 8 });
			const style = await guessStyle(OSM_URL, {
				fetch: () => Promise.resolve(new Response(JSON.stringify(document), { status: 200 })),
			});
			expect(opacity(style, 'landcover-land-forest')).toStrictEqual(ending(8));
		});

		it('adds nothing to plain Shortbread', async () => {
			const style = await guessStyle(shortbread(), { urls: { base: 'https://example.com' } });
			expect(landcoverLayers(style)).toStrictEqual([]);
			expect(Object.keys(style.sources)).toStrictEqual(['versatiles-shortbread']);
		});
	});

	describe('satellite', () => {
		it('rejects `urls.landcover`, because it draws no land cover', () => {
			expect(() => satellite({ urls: { landcover: LANDCOVER_URL } as never })).toThrow(/landcover/);
		});

		it('draws no land cover in its overlay', () => {
			expect(landcoverLayers(satellite())).toStrictEqual([]);
			expect(Object.keys(satellite().sources)).not.toContain('versatiles-landcover');
		});
	});
});

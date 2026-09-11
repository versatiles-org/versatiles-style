import { describe, expect, it } from 'vitest';
import { osm } from './osm.js';
import type { StyleSpecification, TileJSONSpecification } from '../types/index.js';

function layerIds(style: StyleSpecification): string[] {
	return style.layers.map((l) => l.id);
}

function layerById(style: StyleSpecification, id: string) {
	return style.layers.find((l) => l.id === id);
}

// ── Basic output validity ─────────────────────────────────────────────────────

describe('osm()', () => {
	it('returns a valid MapLibre style', async () => {
		const style = await osm();
		expect(style.version).toBe(8);
		expect(style.sources).toBeDefined();
		expect(style.layers.length).toBeGreaterThan(50);
		expect(typeof style.glyphs).toBe('string');
		expect(style.sprite).toBeDefined();
	});

	it('includes slot anchor layers', async () => {
		const ids = layerIds(await osm());
		expect(ids).toContain('slot-below-fills');
		expect(ids).toContain('slot-below-streets');
		expect(ids).toContain('slot-below-symbols');
		expect(ids).toContain('slot-below-labels');
	});

	it('includes background and water-ocean', async () => {
		const ids = layerIds(await osm());
		expect(ids).toContain('background');
		expect(ids).toContain('water-ocean');
	});

	it('uses versatiles-shortbread vector source for non-background layers', async () => {
		const style = await osm();
		const nonBg = style.layers.filter((l) => l.type !== 'background');
		for (const layer of nonBg) {
			expect((layer as Record<string, unknown>).source).toBe('versatiles-shortbread');
		}
	});

	// ── URL configuration ───────────────────────────────────────────────────────

	it('applies custom base URL to the osm source', async () => {
		const style = osm({ urls: { base: 'https://my.cdn.com' } });
		const src = style.sources['versatiles-shortbread'] as { url: string };
		expect(src.url).toContain('my.cdn.com');
	});

	it('references an explicit osm TileJSON URL rather than fetching it', async () => {
		const style = osm({ urls: { osm: 'https://custom.tiles/tiles.json' } });
		const src = style.sources['versatiles-shortbread'] as { url: string };
		expect(src.url).toBe('https://custom.tiles/tiles.json');
		expect(src).not.toHaveProperty('tiles');
	});

	it('inlines a pre-fetched TileJSON instead of referencing it', () => {
		const style = osm({
			urls: { osm: { tilejson: '3.0.0', tiles: ['https://custom.tiles/{z}/{x}/{y}'], maxzoom: 14 } as never },
		});
		const src = style.sources['versatiles-shortbread'] as { tiles: string[]; maxzoom: number };
		expect(src.tiles[0]).toBe('https://custom.tiles/{z}/{x}/{y}');
		expect(src.maxzoom).toBe(14);
		expect(src).not.toHaveProperty('url');
	});

	it('applies glyphs from custom base URL', async () => {
		const style = await osm({ urls: { base: 'https://my.cdn.com' } });
		expect(style.glyphs).toContain('my.cdn.com');
	});

	// ── Theme ───────────────────────────────────────────────────────────────────

	it('produces different background colors for different palettes', async () => {
		const colorful = await osm({ theme: 'colorful' });
		const gray = await osm({ theme: 'gray' });
		const bgColorful = (colorful.layers.find((l) => l.id === 'background')?.paint as Record<string, string>)?.[
			'background-color'
		];
		const bgGray = (gray.layers.find((l) => l.id === 'background')?.paint as Record<string, string>)?.[
			'background-color'
		];
		expect(bgColorful).toBeDefined();
		expect(bgGray).toBeDefined();
		expect(bgColorful).not.toBe(bgGray);
	});

	it('a dark theme produces different colors than its light theme', async () => {
		const light = await osm({ theme: 'colorful' });
		const dark = await osm({ theme: 'colorful-dark' });
		const bgLight = (light.layers.find((l) => l.id === 'background')?.paint as Record<string, string>)?.[
			'background-color'
		];
		const bgDark = (dark.layers.find((l) => l.id === 'background')?.paint as Record<string, string>)?.[
			'background-color'
		];
		expect(bgLight).not.toBe(bgDark);
	});

	it('applies custom color override', async () => {
		const normal = await osm();
		const blue = await osm({ colors: { water: '#0000FF' } });
		const getWaterColor = (s: StyleSpecification) =>
			(layerById(s, 'water-ocean')?.paint as Record<string, string> | undefined)?.['fill-color'];
		// The override changes the water color; exact format (rgb/hex) is not asserted
		expect(getWaterColor(blue)).not.toBe(getWaterColor(normal));
		expect(getWaterColor(blue)).toContain('0,0,255');
	});

	// ── Language ─────────────────────────────────────────────────────────────────

	it('sets label field to local name by default', async () => {
		const style = await osm();
		const placeLayer = style.layers.find((l) => l.id === 'label-place-village');
		const layout = placeLayer?.layout as Record<string, unknown> | undefined;
		expect(layout).toBeDefined();
		// local language uses ['get', 'name'] — the text-field expression should reference 'name'
		const textField = JSON.stringify(layout?.['text-field']);
		expect(textField).toContain('name');
	});

	it('applies explicit language to labels', async () => {
		const style = await osm({ text: { language: 'de' } });
		const placeLayer = style.layers.find((l) => l.id === 'label-place-village');
		const layout = placeLayer?.layout as Record<string, unknown> | undefined;
		const textField = JSON.stringify(layout?.['text-field']);
		expect(textField).toContain('name_de');
	});

	// ── Layer groups ─────────────────────────────────────────────────────────────

	it('removes all buildings when layers.buildings = false', async () => {
		const style = await osm({ layers: { buildings: false } });
		// Invisible layers are dropped entirely, not shipped as hidden no-ops.
		expect(layerById(style, 'building')).toBeUndefined();
	});

	it('removes labels when layers.labels = false', async () => {
		const style = await osm({ layers: { labels: false } });
		expect(layerById(style, 'label-place-village')).toBeUndefined();
	});

	it('removes sub-group: layers.labels.places = false', async () => {
		const style = await osm({ layers: { labels: { places: false } } });
		expect(layerById(style, 'label-place-village')).toBeUndefined();
		// street labels should remain (untouched by the places override)
		expect(layerById(style, 'label-street-residential')).toBeDefined();
	});

	it('sets opacity on a layer group, merging with the layer’s existing fade', async () => {
		const style = await osm({ layers: { buildings: 0.5 } });
		const buildingLayer = layerById(style, 'building');
		// `building` fades in over z14→15 ({14:0, 15:1}); dimming by 0.5 scales the target to 0.5.
		expect((buildingLayer?.paint as Record<string, unknown>)?.['fill-opacity']).toStrictEqual([
			'interpolate',
			['linear'],
			['zoom'],
			14,
			0,
			15,
			0.5,
		]);
	});

	it('icons alias removes pois and transit stops', async () => {
		const style = await osm({ layers: { icons: false } });
		expect(layerById(style, 'poi-amenity')).toBeUndefined();
	});

	it('specific group overrides icons alias', async () => {
		const style = await osm({ layers: { icons: false, pois: true } });
		// pois: true should override icons: false, so the layer remains
		expect(layerById(style, 'poi-amenity')).toBeDefined();
	});

	// ── Scale ────────────────────────────────────────────────────────────────────

	it('applies text scale to symbol layers', async () => {
		const normal = await osm();
		const scaled = await osm({ layout: { scale: { labels: 1.5 } } });
		const getTextSize = (s: StyleSpecification) => {
			const l = s.layers.find((l) => l.id === 'label-place-village');
			return (l?.layout as Record<string, unknown>)?.['text-size'];
		};
		const n = getTextSize(normal);
		const s = getTextSize(scaled);
		if (typeof n === 'number' && typeof s === 'number') expect(s).toBeCloseTo(n * 1.5);
		// If text-size uses stops, just check it differs
		else expect(s).not.toStrictEqual(n);
	});

	// ── Features ─────────────────────────────────────────────────────────────────

	it('adds terrain when features.terrain = true', async () => {
		const style = await osm({ features: { terrain: true } });
		expect(style.terrain).toBeDefined();
		expect(style.sources).toHaveProperty('elevation');
	});

	it('adds hillshade layer when features.hillshade = true', async () => {
		const style = await osm({ features: { hillshade: true } });
		expect(layerIds(style)).toContain('hillshade');
		expect(style.sources).toHaveProperty('elevation');
	});

	it('adds 3D buildings when features.buildings = extruded', async () => {
		const style = await osm({ features: { buildings: 'extruded' } });
		expect(layerById(style, 'building')).toBeUndefined();
		expect(layerById(style, 'building:outline')).toBeUndefined();
		expect(layerById(style, 'building-3d')).toBeDefined();
	});

	it('renders 3D buildings as the last (topmost) layer', async () => {
		const ids = layerIds(await osm({ features: { buildings: 'extruded' } }));
		expect(ids[ids.length - 1]).toBe('building-3d');
		// The flat footprints and every label sit below it.
		expect(ids.indexOf('label-place-village')).toBeLessThan(ids.indexOf('building-3d'));
	});

	it('has no 3D buildings when features.buildings = flat', async () => {
		const style = await osm({ features: { buildings: 'flat' } });
		expect(layerById(style, 'building')).toBeDefined();
		expect(layerById(style, 'building:outline')).toBeDefined();
		expect(layerById(style, 'building-3d')).toBeUndefined();
	});

	it('applies recolor', async () => {
		const normal = await osm();
		const recolored = await osm({ recolor: { invertBrightness: true } });
		const bg = (l: StyleSpecification) =>
			(l.layers.find((x) => x.id === 'background')?.paint as Record<string, string>)?.['background-color'];
		expect(bg(normal)).not.toBe(bg(recolored));
	});

	// ── Static properties ─────────────────────────────────────────────────────────

	it('osm.palettes lists all palette names', () => {
		expect(osm.palettes).toEqual([
			'colorful',
			'colorful-dark',
			'natural',
			'natural-dark',
			'muted',
			'muted-dark',
			'gray',
			'gray-dark',
			'toner',
			'toner-dark',
		]);
	});

	it('osm.colorKeys lists all color key names', () => {
		expect(osm.colorKeys.length).toBeGreaterThanOrEqual(41);
		expect(osm.colorKeys).toContain('water');
		expect(osm.colorKeys).toContain('building');
	});

	it('osm.slots has all expected slot IDs', () => {
		expect(osm.slots.belowFills).toBe('slot-below-fills');
		expect(osm.slots.belowStreets).toBe('slot-below-streets');
		expect(osm.slots.belowSymbols).toBe('slot-below-symbols');
		expect(osm.slots.belowLabels).toBe('slot-below-labels');
	});

	it('osm.defaults returns a ResolvedOsm object', () => {
		const d = osm.defaults;
		expect(d.theme).toBe('colorful');
		expect(d.features.terrain).toBe(false);
		expect(typeof d.urls.glyphsPattern).toBe('string');
	});

	it('osm.colors returns palette colors', () => {
		const colors = osm.colors('toner');
		expect(typeof colors.background).toBe('string');
		expect(typeof colors.water).toBe('string');
	});

	it('osm.resolveOptions resolves options', () => {
		const r = osm.resolveOptions({ theme: 'toner' });
		expect(r.theme).toBe('toner');
	});

	it('osm.languages returns language codes from TileJSON', () => {
		const tileJSON = {
			tiles: ['https://tiles/{z}/{x}/{y}'],
			vector_layers: [{ id: 'place_labels', fields: { name: 'String', name_de: 'String', name_en: 'String' } }],
		} as TileJSONSpecification;
		const langs = osm.languages(tileJSON);
		expect(langs).toContain('de');
		expect(langs).toContain('en');
		expect(langs).not.toContain('name');
	});
});

// Upstreamed from maplibre-versatiles-styler, which hardcoded the threshold (z7) — D2 in the 6.0
// release notes. The threshold is now derived from the land table, so these pin its value.
describe('osm.supportsLandcover', () => {
	const withLand = (land?: { minzoom?: number }) =>
		({
			tilejson: '3.0.0',
			tiles: ['https://example.com/{z}/{x}/{y}'],
			vector_layers: land ? [{ id: 'land', fields: {}, ...land }] : [{ id: 'water_polygons', fields: {} }],
		}) as never;

	it('detects a land layer reaching below plain Shortbread', () => {
		expect(osm.supportsLandcover(withLand({ minzoom: 0 }))).toBe(true);
		expect(osm.supportsLandcover(withLand({ minzoom: 6 }))).toBe(true);
	});

	it('rejects plain Shortbread, where forest starts at z7', () => {
		expect(osm.supportsLandcover(withLand({ minzoom: 7 }))).toBe(false);
		expect(osm.supportsLandcover(withLand({ minzoom: 10 }))).toBe(false);
	});

	it('treats missing metadata as "no landcover"', () => {
		expect(osm.supportsLandcover(withLand({}))).toBe(false);
		expect(osm.supportsLandcover(withLand())).toBe(false);
		expect(osm.supportsLandcover({ tilejson: '3.0.0', tiles: ['https://example.com/{z}/{x}/{y}'] } as never)).toBe(
			false
		);
	});
});

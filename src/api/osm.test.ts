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

	it('applies custom base URL to osm tiles', async () => {
		const style = await osm({ urls: { base: 'https://my.cdn.com' } });
		const src = style.sources['versatiles-shortbread'] as { tiles: string[] };
		expect(src.tiles[0]).toContain('my.cdn.com');
	});

	it('uses explicit osm tile URL verbatim', async () => {
		const style = await osm({ urls: { osm: 'https://custom.tiles/tiles.json' } });
		const src = style.sources['versatiles-shortbread'] as { tiles: string[] };
		expect(src.tiles[0]).toBe('https://custom.tiles/{z}/{x}/{y}');
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

	it('palette shorthand works', async () => {
		const s1 = await osm({ theme: 'toner' });
		const s2 = await osm({ theme: { palette: 'toner', darkMode: false } });
		const bg1 = (s1.layers.find((l) => l.id === 'background')?.paint as Record<string, string>)?.['background-color'];
		const bg2 = (s2.layers.find((l) => l.id === 'background')?.paint as Record<string, string>)?.['background-color'];
		expect(bg1).toBe(bg2);
	});

	it('dark mode produces different colors than light mode', async () => {
		const light = await osm({ theme: { palette: 'colorful', darkMode: false } });
		const dark = await osm({ theme: { palette: 'colorful', darkMode: true } });
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

	it('sets opacity on a layer group', async () => {
		const style = await osm({ layers: { buildings: 0.5 } });
		const buildingLayer = layerById(style, 'building');
		expect((buildingLayer?.paint as Record<string, unknown>)?.['fill-opacity']).toBe(0.5);
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
		expect(osm.palettes).toEqual(['colorful', 'natural', 'muted', 'gray', 'toner']);
	});

	it('osm.colorKeys lists all color key names', () => {
		expect(osm.colorKeys.length).toBeGreaterThanOrEqual(41);
		expect(osm.colorKeys).toContain('water');
		expect(osm.colorKeys).toContain('building');
	});

	it('osm.layerGroups has expected top-level keys', () => {
		const keys = Object.keys(osm.layerGroups);
		expect(keys).toContain('land');
		expect(keys).toContain('water');
		expect(keys).toContain('roads');
		expect(keys).toContain('buildings');
		expect(keys).toContain('labels');
		expect(keys).toContain('icons');
	});

	it('osm.slots has all expected slot IDs', () => {
		expect(osm.slots.belowFills).toBe('slot-below-fills');
		expect(osm.slots.belowStreets).toBe('slot-below-streets');
		expect(osm.slots.belowSymbols).toBe('slot-below-symbols');
		expect(osm.slots.belowLabels).toBe('slot-below-labels');
	});

	it('osm.defaults returns a ResolvedOsmOptions object', () => {
		const d = osm.defaults;
		expect(d.theme).toEqual({ palette: 'colorful', darkMode: false });
		expect(d.features.terrain).toBe(false);
		expect(typeof d.urls.glyphsPattern).toBe('string');
	});

	it('osm.colors returns palette colors', () => {
		const colors = osm.colors('toner', false);
		expect(typeof colors.background).toBe('string');
		expect(typeof colors.water).toBe('string');
	});

	it('osm.resolveOptions resolves options', () => {
		const r = osm.resolveOptions({ theme: 'toner' });
		expect(r.theme.palette).toBe('toner');
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

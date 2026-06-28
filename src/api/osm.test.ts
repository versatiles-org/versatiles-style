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
	it('returns a valid MapLibre style', () => {
		const style = osm();
		expect(style.version).toBe(8);
		expect(style.sources).toBeDefined();
		expect(style.layers.length).toBeGreaterThan(50);
		expect(typeof style.glyphs).toBe('string');
		expect(style.sprite).toBeDefined();
	});

	it('includes slot anchor layers', () => {
		const ids = layerIds(osm());
		expect(ids).toContain('slot-below-fills');
		expect(ids).toContain('slot-below-streets');
		expect(ids).toContain('slot-below-symbols');
		expect(ids).toContain('slot-below-labels');
	});

	it('includes background and water-ocean', () => {
		const ids = layerIds(osm());
		expect(ids).toContain('background');
		expect(ids).toContain('water-ocean');
	});

	it('uses versatiles-shortbread vector source for non-background layers', () => {
		const style = osm();
		const nonBg = style.layers.filter((l) => l.type !== 'background');
		for (const layer of nonBg) {
			expect((layer as Record<string, unknown>).source).toBe('versatiles-shortbread');
		}
	});

	// ── URL configuration ───────────────────────────────────────────────────────

	it('applies custom base URL to osm tiles', () => {
		const style = osm({ urls: { base: 'https://my.cdn.com' } });
		const src = style.sources['versatiles-shortbread'] as { tiles: string[] };
		expect(src.tiles[0]).toContain('my.cdn.com');
	});

	it('uses explicit osm tile URL verbatim', () => {
		const style = osm({ urls: { osm: 'https://custom.tiles/{z}/{x}/{y}' } });
		const src = style.sources['versatiles-shortbread'] as { tiles: string[] };
		expect(src.tiles[0]).toBe('https://custom.tiles/{z}/{x}/{y}');
	});

	it('uses TileJSONSpecification for osm source', () => {
		const tileJSON = { tiles: ['https://tj.example/{z}/{x}/{y}'], minzoom: 2, maxzoom: 12 } as TileJSONSpecification;
		const style = osm({ urls: { osm: tileJSON } });
		const src = style.sources['versatiles-shortbread'] as { tiles: string[]; minzoom: number };
		expect(src.tiles[0]).toBe('https://tj.example/{z}/{x}/{y}');
		expect(src.minzoom).toBe(2);
	});

	it('applies glyphs from custom base URL', () => {
		const style = osm({ urls: { base: 'https://my.cdn.com' } });
		expect(style.glyphs).toContain('my.cdn.com');
	});

	// ── Theme ───────────────────────────────────────────────────────────────────

	it('produces different background colors for different palettes', () => {
		const colorful = osm({ theme: 'colorful' });
		const gray = osm({ theme: 'gray' });
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

	it('palette shorthand works', () => {
		const s1 = osm({ theme: 'toner' });
		const s2 = osm({ theme: { palette: 'toner', darkMode: false } });
		const bg1 = (s1.layers.find((l) => l.id === 'background')?.paint as Record<string, string>)?.['background-color'];
		const bg2 = (s2.layers.find((l) => l.id === 'background')?.paint as Record<string, string>)?.['background-color'];
		expect(bg1).toBe(bg2);
	});

	it('dark mode produces different colors than light mode', () => {
		const light = osm({ theme: { palette: 'colorful', darkMode: false } });
		const dark = osm({ theme: { palette: 'colorful', darkMode: true } });
		const bgLight = (light.layers.find((l) => l.id === 'background')?.paint as Record<string, string>)?.[
			'background-color'
		];
		const bgDark = (dark.layers.find((l) => l.id === 'background')?.paint as Record<string, string>)?.[
			'background-color'
		];
		expect(bgLight).not.toBe(bgDark);
	});

	it('applies custom color override', () => {
		const normal = osm();
		const blue = osm({ colors: { water: '#0000FF' } });
		const getWaterColor = (s: StyleSpecification) =>
			(layerById(s, 'water-ocean')?.paint as Record<string, string> | undefined)?.['fill-color'];
		// The override changes the water color; exact format (rgb/hex) is not asserted
		expect(getWaterColor(blue)).not.toBe(getWaterColor(normal));
		expect(getWaterColor(blue)).toContain('0,0,255');
	});

	// ── Language ─────────────────────────────────────────────────────────────────

	it('sets label field to local name by default', () => {
		const style = osm();
		const placeLayer = style.layers.find((l) => l.id === 'label-place-village');
		const layout = placeLayer?.layout as Record<string, unknown> | undefined;
		expect(layout).toBeDefined();
		// local language uses ['get', 'name'] — the text-field expression should reference 'name'
		const textField = JSON.stringify(layout?.['text-field']);
		expect(textField).toContain('name');
	});

	it('applies explicit language to labels', () => {
		const style = osm({ text: { language: 'de' } });
		const placeLayer = style.layers.find((l) => l.id === 'label-place-village');
		const layout = placeLayer?.layout as Record<string, unknown> | undefined;
		const textField = JSON.stringify(layout?.['text-field']);
		expect(textField).toContain('name_de');
	});

	// ── Layer groups ─────────────────────────────────────────────────────────────

	it('hides all buildings when layers.buildings = false', () => {
		const style = osm({ layers: { buildings: false } });
		const buildingLayer = layerById(style, 'building');
		const layout = buildingLayer?.layout as Record<string, unknown> | undefined;
		expect(layout?.visibility).toBe('none');
	});

	it('hides labels when layers.labels = false', () => {
		const style = osm({ layers: { labels: false } });
		const placeLayer = layerById(style, 'label-place-village');
		const layout = placeLayer?.layout as Record<string, unknown> | undefined;
		expect(layout?.visibility).toBe('none');
	});

	it('hides sub-group: layers.labels.places = false', () => {
		const style = osm({ layers: { labels: { places: false } } });
		const placeLayer = layerById(style, 'label-place-village');
		expect((placeLayer?.layout as Record<string, unknown>)?.visibility).toBe('none');
		// street labels should remain visible (not hidden)
		const streetLabel = layerById(style, 'label-street');
		expect((streetLabel?.layout as Record<string, unknown>)?.visibility).not.toBe('none');
	});

	it('sets opacity on a layer group', () => {
		const style = osm({ layers: { buildings: 0.5 } });
		const buildingLayer = layerById(style, 'building');
		expect((buildingLayer?.paint as Record<string, unknown>)?.['fill-opacity']).toBe(0.5);
	});

	it('icons alias hides pois and transit stops', () => {
		const style = osm({ layers: { icons: false } });
		const poi = layerById(style, 'poi-amenity');
		expect((poi?.layout as Record<string, unknown>)?.visibility).toBe('none');
	});

	it('specific group overrides icons alias', () => {
		const style = osm({ layers: { icons: false, pois: true } });
		const poi = layerById(style, 'poi-amenity');
		// pois: true should override icons: false
		expect((poi?.layout as Record<string, unknown>)?.visibility).not.toBe('none');
	});

	// ── Scale ────────────────────────────────────────────────────────────────────

	it('applies text scale to symbol layers', () => {
		const normal = osm();
		const scaled = osm({ layout: { scale: { labels: 1.5 } } });
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

	it('adds terrain when features.terrain = true', () => {
		const style = osm({ features: { terrain: true } });
		expect(style.terrain).toBeDefined();
		expect(style.sources).toHaveProperty('elevation');
	});

	it('adds hillshade layer when features.hillshade = true', () => {
		const style = osm({ features: { hillshade: true } });
		expect(layerIds(style)).toContain('hillshade');
		expect(style.sources).toHaveProperty('elevation');
	});

	it('adds 3D buildings when features.buildings = extruded', () => {
		const style = osm({ features: { buildings: 'extruded' } });
		const flat = layerById(style, 'building');
		const b3d = layerById(style, 'building-3d');
		expect((flat?.layout as Record<string, unknown>)?.visibility).toBe('none');
		expect((b3d?.layout as Record<string, unknown>)?.visibility).toBe('visible');
	});

	it('applies recolor', () => {
		const normal = osm();
		const recolored = osm({ recolor: { invertBrightness: true } });
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

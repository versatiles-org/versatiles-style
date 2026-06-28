import { describe, expect, it } from 'vitest';
import type { TileJSONSpecification } from '../types/index.js';
import { resolveOsmOptions } from './resolveOsmOptions.js';
import { resolveSatelliteOptions } from './resolveSatelliteOptions.js';
import {
	resolveTheme,
	resolveColors,
	resolveSun,
	resolveSky,
	resolveText,
	resolveLayout,
	resolveFeatures,
} from './resolveOsmOptions.js';

const DEFAULT_BASE = 'https://tiles.versatiles.org';

// ── resolveOsmOptions ─────────────────────────────────────────────────────────

describe('resolveOsmOptions', () => {
	it('returns sensible defaults when called with no arguments', () => {
		const r = resolveOsmOptions();
		expect(r.theme).toEqual({ palette: 'colorful', darkMode: false });
		expect(r.urls.base).toBe(DEFAULT_BASE);
		expect(typeof r.urls.osm).toBe('string');
		expect(typeof r.urls.elevation).toBe('string');
		expect(typeof r.urls.glyphsPattern).toBe('string');
		expect(r.urls.sprite).toBeInstanceOf(Array);
		expect(r.features.terrain).toBe(false);
		expect(r.features.hillshade).toBe(false);
		expect(r.features.landcover).toBe(false);
		expect(r.features.buildings).toBe('flat');
		expect(r.layers).toEqual({});
		expect(r.recolor).toBeUndefined();
	});

	it('resolves palette shorthand in theme', () => {
		const r = resolveOsmOptions({ theme: 'toner' });
		expect(r.theme.palette).toBe('toner');
		expect(r.theme.darkMode).toBe(false);
	});

	it('resolves theme object with darkMode', () => {
		const r = resolveOsmOptions({ theme: { palette: 'gray', darkMode: true } });
		expect(r.theme).toEqual({ palette: 'gray', darkMode: true });
	});

	it('resolves custom base URL and builds relative URLs from it', () => {
		const r = resolveOsmOptions({ urls: { base: 'https://my.server.com' } });
		expect(r.urls.base).toBe('https://my.server.com');
		expect(r.urls.osm).toContain('my.server.com');
		expect(r.urls.glyphsPattern).toContain('my.server.com');
	});

	it('passes through explicit osm URL strings unchanged', () => {
		const r = resolveOsmOptions({ urls: { osm: 'https://custom.tiles/{z}/{x}/{y}' } });
		expect(r.urls.osm).toBe('https://custom.tiles/{z}/{x}/{y}');
	});

	it('passes through TileJSONSpecification for osm', () => {
		const tileJSON = { tiles: ['https://a/{z}/{x}/{y}'], minzoom: 0, maxzoom: 14 } as TileJSONSpecification;
		const r = resolveOsmOptions({ urls: { osm: tileJSON } });
		expect(r.urls.osm).toBe(tileJSON);
	});

	it('resolves sprite string to SpriteEntry array', () => {
		const r = resolveOsmOptions({ urls: { sprite: 'https://cdn/sprites/basics' } });
		const sprite = r.urls.sprite as Array<{ id: string; url: string }>;
		expect(sprite).toBeInstanceOf(Array);
		expect(sprite[0].url).toBe('https://cdn/sprites/basics');
		expect(sprite[0].id).toBe('basics');
	});

	it('resolves sprite array and resolves relative URLs', () => {
		const r = resolveOsmOptions({
			urls: {
				base: 'https://tiles.example.com',
				sprite: [{ id: 'basics', url: '/assets/sprites/basics/sprites' }],
			},
		});
		const sprite = r.urls.sprite as Array<{ id: string; url: string }>;
		expect(sprite[0].url).toBe('https://tiles.example.com/assets/sprites/basics/sprites');
	});

	it('merges user color overrides on top of palette', () => {
		const r = resolveOsmOptions({ colors: { water: '#112233' } });
		expect(r.colors.water).toBe('#112233');
		// Other colors come from the palette
		expect(typeof r.colors.land).toBe('string');
	});

	it('returns all 41 color keys', () => {
		const r = resolveOsmOptions();
		const keys = Object.keys(r.colors);
		expect(keys.length).toBeGreaterThanOrEqual(41);
	});

	it('resolves terrain true to default exaggeration', () => {
		const r = resolveOsmOptions({ features: { terrain: true } });
		expect(r.features.terrain).toEqual({ exaggeration: 1.0 });
	});

	it('resolves terrain with custom exaggeration', () => {
		const r = resolveOsmOptions({ features: { terrain: { exaggeration: 2.5 } } });
		expect(r.features.terrain).toEqual({ exaggeration: 2.5 });
	});

	it('resolves hillshade true to defaults', () => {
		const r = resolveOsmOptions({ features: { hillshade: true } });
		expect(r.features.hillshade).toMatchObject({
			exaggeration: 0.1,
			shadowColor: '#000000',
			highlightColor: '#ffffff',
			accentColor: '#000000',
			anchor: 'map',
		});
	});

	it('resolves hillshade object with partial overrides', () => {
		const r = resolveOsmOptions({ features: { hillshade: { anchor: 'viewport', exaggeration: 0.5 } } });
		expect(r.features.hillshade).toMatchObject({ anchor: 'viewport', exaggeration: 0.5 });
	});

	it('resolves buildings extruded', () => {
		const r = resolveOsmOptions({ features: { buildings: 'extruded' } });
		expect(r.features.buildings).toBe('extruded');
	});

	it('passes recolor through', () => {
		const recolor = { rotateHue: 120 };
		const r = resolveOsmOptions({ recolor });
		expect(r.recolor).toBe(recolor);
	});
});

// ── sub-resolvers ─────────────────────────────────────────────────────────────

describe('resolveTheme', () => {
	it('returns colorful/light defaults with no input', () => {
		expect(resolveTheme()).toEqual({ palette: 'colorful', darkMode: false });
	});

	it('handles palette string shorthand', () => {
		expect(resolveTheme('muted')).toEqual({ palette: 'muted', darkMode: false });
	});

	it('handles full theme object', () => {
		expect(resolveTheme({ palette: 'gray', darkMode: true })).toEqual({ palette: 'gray', darkMode: true });
	});

	it('defaults missing palette in theme object to colorful', () => {
		expect(resolveTheme({ darkMode: true })).toEqual({ palette: 'colorful', darkMode: true });
	});
});

describe('resolveColors', () => {
	it('returns all color keys from palette', () => {
		const colors = resolveColors({ palette: 'colorful', darkMode: false });
		expect(typeof colors.background).toBe('string');
		expect(typeof colors.water).toBe('string');
	});

	it('merges overrides on top', () => {
		const colors = resolveColors({ palette: 'colorful', darkMode: false }, { water: '#ff0000' });
		expect(colors.water).toBe('#ff0000');
	});
});

describe('resolveSun', () => {
	it('fills all defaults', () => {
		expect(resolveSun()).toEqual({ direction: 315, altitude: 45, color: '#ffffff', intensity: 0.5 });
	});

	it('merges partial overrides', () => {
		expect(resolveSun({ direction: 90 })).toMatchObject({ direction: 90, altitude: 45 });
	});
});

describe('resolveSky', () => {
	it('fills all defaults', () => {
		expect(resolveSky()).toMatchObject({
			skyColor: '#87CEEB',
			horizonColor: '#ffffff',
			skyHorizonBlend: 0.5,
			horizonFogBlend: 0.5,
			atmosphereBlend: 0,
		});
	});
});

describe('resolveText', () => {
	it('fills defaults', () => {
		const t = resolveText();
		expect(t.language).toBe('local');
		expect(t.languageStrict).toBe(false);
		expect(t.fontNormal).toBe('noto_sans_regular');
		expect(t.fontBold).toBe('noto_sans_bold');
	});

	it('uses custom font names', () => {
		const t = resolveText({ fontNormal: 'Roboto Regular', fontBold: 'Roboto Bold' });
		expect(t.fontNormal).toBe('Roboto Regular');
		expect(t.fontBold).toBe('Roboto Bold');
	});

	it('preserves explicit language', () => {
		expect(resolveText({ language: 'de' }).language).toBe('de');
	});
});

describe('resolveLayout', () => {
	it('fills defaults', () => {
		const l = resolveLayout();
		expect(l.labels).toEqual({ scale: 1, spacing: 1 });
		expect(l.icons).toEqual({ scale: 1, spacing: 1 });
	});

	it('applies scalar scale to both labels and icons', () => {
		const l = resolveLayout({ scale: 1.5 });
		expect(l.labels.scale).toBe(1.5);
		expect(l.icons.scale).toBe(1.5);
	});

	it('applies per-group scale', () => {
		const l = resolveLayout({ scale: { labels: 1.2, icons: 0.8 } });
		expect(l.labels.scale).toBe(1.2);
		expect(l.icons.scale).toBe(0.8);
	});
});

describe('resolveFeatures', () => {
	it('defaults all features off', () => {
		const f = resolveFeatures();
		expect(f.terrain).toBe(false);
		expect(f.hillshade).toBe(false);
		expect(f.landcover).toBe(false);
		expect(f.buildings).toBe('flat');
	});
});

// ── resolveSatelliteOptions ───────────────────────────────────────────────────

describe('resolveSatelliteOptions', () => {
	it('returns defaults with no arguments', () => {
		const r = resolveSatelliteOptions();
		expect(r.urls.base).toBe(DEFAULT_BASE);
		expect(typeof r.urls.satellite).toBe('string');
		expect(r.osmOverlay).toBe(false);
		expect(r.features.terrain).toBe(false);
		expect(r.features.hillshade).toBe(false);
		expect(r.raster.opacity).toBe(1);
		expect(r.raster.saturation).toBe(0);
	});

	it('resolves satellite URL against base', () => {
		const r = resolveSatelliteOptions({ urls: { base: 'https://cdn.example.com' } });
		expect(r.urls.satellite).toContain('cdn.example.com');
	});

	it('resolves osmOverlay with content options', () => {
		const r = resolveSatelliteOptions({ osmOverlay: { theme: 'toner' } });
		expect(r.osmOverlay).not.toBe(false);
		if (r.osmOverlay !== false) {
			expect(r.osmOverlay.theme.palette).toBe('toner');
		}
	});

	it('sets osmOverlay to false when explicitly false', () => {
		expect(resolveSatelliteOptions({ osmOverlay: false }).osmOverlay).toBe(false);
	});

	it('resolves raster options with partial overrides', () => {
		const r = resolveSatelliteOptions({ raster: { saturation: -0.3, opacity: 0.9 } });
		expect(r.raster.saturation).toBe(-0.3);
		expect(r.raster.opacity).toBe(0.9);
		expect(r.raster.contrast).toBe(0);
	});

	it('resolves hillshade in satellite features', () => {
		const r = resolveSatelliteOptions({ features: { hillshade: { exaggeration: 0.3 } } });
		expect(r.features.hillshade).toMatchObject({ exaggeration: 0.3 });
	});
});

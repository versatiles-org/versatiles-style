import { describe, expect, it } from 'vitest';
import { resolveOsm } from './osm.js';
import { resolveSatellite } from './satellite.js';
import { resolveTheme } from './theme.js';
import { resolveColors } from './colors.js';
import { resolveSun } from './sun.js';
import { resolveSky } from './sky.js';
import { resolveText } from './text.js';
import { resolveLayout } from './layout.js';
import { resolveOsmFeatures } from './features.js';

// ── resolveOsm ─────────────────────────────────────────────────────────

describe('resolveOsm', () => {
	it('returns sensible defaults when called with no arguments', () => {
		const r = resolveOsm();
		expect(r.theme).toEqual({ palette: 'colorful', darkMode: false });
		expect(typeof r.urls.osm).toBe('string');
		expect(typeof r.urls.elevation).toBe('string');
		expect(typeof r.urls.glyphsPattern).toBe('string');
		expect(r.urls.sprite).toBeInstanceOf(Array);
		expect(r.features.terrain).toBe(false);
		expect(r.features.hillshade).toBe(false);
		expect(r.features.landcover).toBe(false);
		expect(r.features.buildings).toBe('flat');
		// layers are fully resolved: every group visible by default, except steps (hidden).
		expect(r.layers.buildings).toBe(true);
		expect(r.layers.roads.steps).toBe(false);
		expect(r.layers.roads.motorways).toBe(true);
		expect(r.recolor).toEqual({
			blend: {
				amount: 0,
				color: '#ff0000',
			},
			brightness: 0,
			contrast: 1,
			gamma: 1,
			invertBrightness: false,
			rotateHue: 0,
			saturate: 0,
			tint: {
				amount: 0,
				color: '#ff0000',
			},
		});
	});

	it('resolves palette shorthand in theme', () => {
		const r = resolveOsm({ theme: 'toner' });
		expect(r.theme.palette).toBe('toner');
		expect(r.theme.darkMode).toBe(false);
	});

	it('resolves theme object with darkMode', () => {
		const r = resolveOsm({ theme: { palette: 'gray', darkMode: true } });
		expect(r.theme).toEqual({ palette: 'gray', darkMode: true });
	});

	it('resolves custom base URL and builds relative URLs from it', () => {
		const r = resolveOsm({ urls: { base: 'https://my.server.com' } });
		expect(r.urls.osm).toContain('my.server.com');
		expect(r.urls.glyphsPattern).toContain('my.server.com');
	});

	it('passes through explicit osm URL strings unchanged', () => {
		const r = resolveOsm({ urls: { osm: 'https://custom.tiles/{z}/{x}/{y}' } });
		expect(r.urls.osm).toBe('https://custom.tiles/{z}/{x}/{y}');
	});

	it('resolves sprite string to SpriteEntry array', () => {
		const r = resolveOsm({ urls: { sprite: 'https://cdn/sprites/basics' } });
		const sprite = r.urls.sprite as Array<{ id: string; url: string }>;
		expect(sprite).toBe('https://cdn/sprites/basics');
	});

	it('resolves sprite array and resolves relative URLs', () => {
		const r = resolveOsm({
			urls: {
				base: 'https://tiles.example.com',
				sprite: [{ id: 'basics', url: '/assets/sprites/basics/sprites' }],
			},
		});
		const sprite = r.urls.sprite as Array<{ id: string; url: string }>;
		expect(sprite[0].url).toBe('https://tiles.example.com/assets/sprites/basics/sprites');
	});

	it('merges user color overrides on top of palette', () => {
		const r = resolveOsm({ colors: { water: '#112233' } });
		expect(r.colors.water).toBe('#112233');
		// Other colors come from the palette
		expect(typeof r.colors.land).toBe('string');
	});

	it('returns all 41 color keys', () => {
		const r = resolveOsm();
		const keys = Object.keys(r.colors);
		expect(keys.length).toBeGreaterThanOrEqual(41);
	});

	it('resolves terrain true to default exaggeration', () => {
		const r = resolveOsm({ features: { terrain: true } });
		expect(r.features.terrain).toEqual({ exaggeration: 1.0 });
	});

	it('resolves terrain with custom exaggeration', () => {
		const r = resolveOsm({ features: { terrain: { exaggeration: 2.5 } } });
		expect(r.features.terrain).toEqual({ exaggeration: 2.5 });
	});

	it('resolves hillshade true to defaults', () => {
		const r = resolveOsm({ features: { hillshade: true } });
		expect(r.features.hillshade).toMatchObject({
			exaggeration: 0.1,
			shadowColor: '#000000',
			highlightColor: '#ffffff',
			accentColor: '#000000',
			anchor: 'map',
		});
	});

	it('resolves hillshade object with partial overrides', () => {
		const r = resolveOsm({ features: { hillshade: { anchor: 'viewport', exaggeration: 0.5 } } });
		expect(r.features.hillshade).toMatchObject({ anchor: 'viewport', exaggeration: 0.5 });
	});

	it('resolves buildings extruded', () => {
		const r = resolveOsm({ features: { buildings: 'extruded' } });
		expect(r.features.buildings).toBe('extruded');
	});

	it('passes recolor through', () => {
		expect(resolveOsm({ recolor: { rotateHue: 120 } }).recolor).toStrictEqual({
			blend: {
				amount: 0,
				color: '#ff0000',
			},
			brightness: 0,
			contrast: 1,
			gamma: 1,
			invertBrightness: false,
			rotateHue: 120,
			saturate: 0,
			tint: {
				amount: 0,
				color: '#ff0000',
			},
		});
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
		expect(resolveLayout()).toStrictEqual({ scale: { labels: 1, icons: 1 }, spacing: { labels: 1, icons: 1 } });
	});

	it('applies scalar scale to both labels and icons', () => {
		expect(resolveLayout({ scale: 1.5 })).toStrictEqual({
			scale: { labels: 1.5, icons: 1.5 },
			spacing: { labels: 1, icons: 1 },
		});
	});

	it('applies per-group scale', () => {
		expect(resolveLayout({ scale: { labels: 1.2, icons: 0.8 } })).toStrictEqual({
			scale: { labels: 1.2, icons: 0.8 },
			spacing: { labels: 1, icons: 1 },
		});
	});
});

describe('resolveFeatures', () => {
	it('defaults all features off', () => {
		const f = resolveOsmFeatures();
		expect(f.terrain).toBe(false);
		expect(f.hillshade).toBe(false);
		expect(f.landcover).toBe(false);
		expect(f.buildings).toBe('flat');
	});
});

// ── resolveSatellite ───────────────────────────────────────────────────

describe('resolveSatellite', () => {
	it('returns defaults with no arguments', () => {
		const r = resolveSatellite();
		expect(typeof r.urls.satellite).toBe('string');
		expect(r.osmOverlay).toBe(false);
		expect(r.features.terrain).toBe(false);
		expect(r.features.hillshade).toBe(false);
		expect(r.raster.opacity).toBe(1);
		expect(r.raster.saturation).toBe(0);
	});

	it('resolves satellite URL against base', () => {
		const r = resolveSatellite({ urls: { base: 'https://cdn.example.com' } });
		expect(r.urls.satellite).toContain('cdn.example.com');
	});

	it('resolves osmOverlay with content options', () => {
		const r = resolveSatellite({ osmOverlay: { theme: 'toner' } });
		expect(r.osmOverlay).not.toBe(false);
		if (r.osmOverlay !== false) {
			expect(r.osmOverlay.theme.palette).toBe('toner');
		}
	});

	it('sets osmOverlay to false when explicitly false', () => {
		expect(resolveSatellite({ osmOverlay: false }).osmOverlay).toBe(false);
	});

	it('resolves raster options with partial overrides', () => {
		const r = resolveSatellite({ raster: { saturation: -0.3, opacity: 0.9 } });
		expect(r.raster.saturation).toBe(-0.3);
		expect(r.raster.opacity).toBe(0.9);
		expect(r.raster.contrast).toBe(0);
	});

	it('resolves hillshade in satellite features', () => {
		const r = resolveSatellite({ features: { hillshade: { exaggeration: 0.3 } } });
		expect(r.features.hillshade).toMatchObject({ exaggeration: 0.3 });
	});
});

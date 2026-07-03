import { beforeAll, describe, expect, it } from 'vitest';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { osm } from './osm.js';
import { satellite } from './satellite.js';
import { getStyleVariants } from '../variants.js';
import type { OsmOptions, SatelliteOptions } from '../options/index.js';
import type { StyleSpecification } from '../types/index.js';

// The build pipeline (scripts/build-styles.ts) validates every style against the MapLibre
// style spec via validateStyleMin — but nothing in the test suite did, so a spec-violating
// style would pass CI and only fail at build time. These tests run validateStyleMin over a
// broad option matrix for osm() and satellite(), plus every getStyleVariants() build.
//
// Uses the global fetch stub from vitest.setup.ts (canned Shortbread TileJSON).

// validateStyleMin returns an array of errors; [] means the style is spec-compliant.
function errorsFor(style: StyleSpecification): string[] {
	return validateStyleMin(style).map((e) => e.message);
}

// ── osm() option matrix ──────────────────────────────────────────────────────────

const OSM_CASES: [string, OsmOptions | undefined][] = [
	['defaults', undefined],
	// palettes × dark mode
	...(['colorful', 'natural', 'muted', 'gray', 'toner'] as const).flatMap((palette): [string, OsmOptions][] => [
		[`${palette}/light`, { theme: { palette, darkMode: false } }],
		[`${palette}/dark`, { theme: { palette, darkMode: true } }],
	]),
	// languages
	['lang:en', { text: { language: 'en' } }],
	['lang:de', { text: { language: 'de' } }],
	['lang:de strict', { text: { language: 'de', languageStrict: true } }],
	['custom fonts', { text: { fontNormal: 'my_regular', fontBold: 'my_bold' } }],
	// features
	['terrain', { features: { terrain: true } }],
	['hillshade', { features: { hillshade: true } }],
	['landcover', { features: { landcover: true } }],
	['buildings:extruded', { features: { buildings: 'extruded' } }],
	['terrain+hillshade', { features: { terrain: true, hillshade: true } }],
	[
		'all features + dark + de',
		{
			theme: { palette: 'colorful', darkMode: true },
			text: { language: 'de' },
			features: { terrain: { exaggeration: 2 }, hillshade: true, landcover: true, buildings: 'extruded' },
		},
	],
	// layer-group toggles
	['no labels', { layers: { labels: false } }],
	['no icons', { layers: { icons: false } }],
	['no buildings', { layers: { buildings: false } }],
	['no roads', { layers: { roads: false } }],
	['fractional opacities', { layers: { buildings: 0.5, land: { forest: 0.3 }, roads: 0.7 } }],
	// recolor
	['recolor invert', { recolor: { invertBrightness: true } }],
	['recolor rotateHue', { recolor: { rotateHue: 120 } }],
	[
		'recolor tint+blend',
		{ recolor: { tint: { color: '#00ff00', amount: 0.5 }, blend: { color: '#0000ff', amount: 0.3 } } },
	],
	// layout + sun + sky
	['scale + spacing', { layout: { scale: 1.5, spacing: 2 } }],
	['custom sun + sky', { sun: { direction: 120, altitude: 20 }, sky: { skyColor: '#010203', atmosphereBlend: 0.7 } }],
];

describe('osm() styles are MapLibre-spec valid', () => {
	it.each(OSM_CASES)('osm(%s)', async (_name, options) => {
		expect(errorsFor(await osm(options))).toStrictEqual([]);
	});
});

// ── satellite() option matrix ────────────────────────────────────────────────────

const SAT_CASES: [string, SatelliteOptions | undefined][] = [
	['defaults', undefined],
	['overlay:{}', { osmOverlay: {} }],
	['overlay:toner', { osmOverlay: { theme: 'toner' } }],
	['overlay:de', { osmOverlay: { text: { language: 'de' } } }],
	['overlay:false', { osmOverlay: false }],
	[
		'raster all',
		{
			raster: { opacity: 0.8, hueRotate: 30, brightnessMin: 0.1, brightnessMax: 0.9, saturation: -0.2, contrast: 0.3 },
		},
	],
	['terrain', { features: { terrain: true } }],
	['hillshade', { features: { hillshade: true } }],
	['overlay + terrain + hillshade', { osmOverlay: { theme: 'gray' }, features: { terrain: true, hillshade: true } }],
	['custom sky', { sky: { skyColor: '#112233' } }],
];

describe('satellite() styles are MapLibre-spec valid', () => {
	it.each(SAT_CASES)('satellite(%s)', async (_name, options) => {
		expect(errorsFor(await satellite(options))).toStrictEqual([]);
	});
});

// ── every published style variant ────────────────────────────────────────────────

describe('every getStyleVariants() build is MapLibre-spec valid', () => {
	let built: { name: string; style: StyleSpecification }[];

	beforeAll(async () => {
		built = await Promise.all(getStyleVariants().map(async (v) => ({ name: v.name, style: await v.build() })));
	});

	it('produces the expected number of variants', () => {
		expect(built.length).toBeGreaterThan(0);
	});

	it('has no spec errors in any variant', () => {
		const offenders = built
			.map(({ name, style }) => ({ name, errors: errorsFor(style) }))
			.filter((x) => x.errors.length > 0)
			.map((x) => `${x.name}: ${x.errors.join('; ')}`);
		expect(offenders, `\n${offenders.join('\n')}\n`).toStrictEqual([]);
	});
});

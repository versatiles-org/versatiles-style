import { beforeAll, describe, expect, it } from 'vitest';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { validateStyleMin as validateStyleMinOldest } from 'maplibre-gl-style-spec-min';
import { osm } from './osm.js';
import { satellite } from './satellite.js';
import { getStyleVariants } from '../../scripts/lib/variants.js';
import type { OsmOptions, SatelliteOptions } from '../options/index.js';
import type { StyleSpecification } from '../types/index.js';

// The build pipeline (scripts/build-styles.ts) validates every style against the MapLibre
// style spec via validateStyleMin — but nothing in the test suite did, so a spec-violating
// style would pass CI and only fail at build time. These tests run validateStyleMin over a
// broad option matrix for osm() and satellite(), plus every getStyleVariants() build.
//
// Every style is validated twice: against the installed spec, and against the spec of the lowest
// supported MapLibre GL JS (`maplibre-gl-style-spec-min` is @maplibre/maplibre-gl-style-spec 22.0.1,
// the one MapLibre 5.0.0 ships), so the declared `maplibre-gl >=5.0.0` range stays true.
//
// Uses the global fetch stub from vitest.setup.ts (canned Shortbread TileJSON).

// The one documented exception to the 5.0.0 minimum: `sun` together with `features.hillshade`
// writes this property, which needs MapLibre 5.5.0 (see README).
const NEEDS_5_5 = /unknown property "hillshade-illumination-altitude"/;

// validateStyleMin returns an array of errors; [] means the style is spec-compliant.
function errorsFor(style: StyleSpecification): string[] {
	const oldest = validateStyleMinOldest(style as Parameters<typeof validateStyleMinOldest>[0])
		.map((e) => e.message)
		.filter((message) => !NEEDS_5_5.test(message))
		.map((message) => `MapLibre 5.0.0: ${message}`);
	return [...validateStyleMin(style).map((e) => e.message), ...oldest];
}

// ── osm() option matrix ──────────────────────────────────────────────────────────

const OSM_CASES: [string, OsmOptions | undefined][] = [
	['defaults', undefined],
	// every theme, light and dark
	...osm.palettes.map((palette): [string, OsmOptions] => [palette, { theme: palette }]),
	// languages
	['lang:en', { text: { language: 'en' } }],
	['lang:de', { text: { language: 'de' } }],
	['lang:de strict', { text: { language: 'de', languageStrict: true } }],
	[
		'custom fonts',
		{ text: { font: 'my_regular', water: { font: 'my_italic' }, pois: { general: { font: 'my_bold' } } } },
	],
	[
		'label typography',
		{
			text: {
				maxWidth: 6,
				lineHeight: 1.5,
				letterSpacing: 0.1,
				streets: { transform: 'uppercase', haloWidth: 3, haloBlur: 0 },
				addresses: { transform: 'lowercase', haloWidth: 1 },
			},
		},
	],
	// features
	['terrain', { features: { terrain: true } }],
	['hillshade', { features: { hillshade: true } }],
	['landcover', { features: { landcover: true } }],
	['buildings:extruded', { features: { buildings: 'extruded' } }],
	['terrain+hillshade', { features: { terrain: true, hillshade: true } }],
	[
		'all features + dark + de',
		{
			theme: 'colorful-dark',
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
	['scale + spacing', { text: { scale: 1.5, spacing: 2 }, icon: { scale: 1.5, spacing: 2 } }],
	['spacing below 1 + viewport pitch', { text: { spacing: 0.5, pitchAlignment: 'viewport' }, icon: { spacing: 0.5 } }],
	['custom sun + sky', { sun: { direction: 120, altitude: 20 }, sky: { skyColor: '#010203', atmosphereBlend: 0.7 } }],
	['sun + hillshade', { sun: true, features: { hillshade: true } }],
];

describe('osm() styles are MapLibre-spec valid', () => {
	it.each(OSM_CASES)('osm(%s)', (_name, options) => {
		expect(errorsFor(osm(options))).toStrictEqual([]);
	});
});

describe('the only property newer than MapLibre 5.0.0 is the documented one', () => {
	it('osm(sun + hillshade) fails the 5.0.0 spec on hillshade-illumination-altitude alone', () => {
		const style = osm({ sun: true, features: { hillshade: true } });
		const errors = validateStyleMinOldest(style as Parameters<typeof validateStyleMinOldest>[0]);
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toMatch(NEEDS_5_5);
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
	it.each(SAT_CASES)('satellite(%s)', (_name, options) => {
		expect(errorsFor(satellite(options))).toStrictEqual([]);
	});
});

// ── every published style variant ────────────────────────────────────────────────

describe('every getStyleVariants() build is MapLibre-spec valid', () => {
	let built: { name: string; style: StyleSpecification }[];

	beforeAll(() => {
		built = getStyleVariants().map((v) => ({ name: v.name, style: v.build() }));
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

import { describe, expect, it } from 'vitest';
import { osm } from '../api/osm.js';
import { satellite } from '../api/satellite.js';
import { omt } from '../omt/api.js';
import { protomaps } from '../protomaps/api.js';
import type { ColorsOptions, OsmOptions, SatelliteOptions } from '../options/index.js';
import type { StyleSpecification, TileJSONSpecification } from '../types/index.js';
import { parseRGBA } from './calibrate.js';
import { deriveOptions, type OptionsGuess } from './derive.js';
import { colorDistance } from './math.js';

function osmOptions(guess: OptionsGuess): OsmOptions {
	expect(guess.kind).toBe('osm');
	return (guess as Extract<OptionsGuess, { kind: 'osm' }>).options;
}

function satelliteOptions(guess: OptionsGuess): SatelliteOptions {
	expect(guess.kind).toBe('satellite');
	return (guess as Extract<OptionsGuess, { kind: 'satellite' }>).options;
}

/** Colours are estimates: the same keys, each within a barely visible difference. */
function expectColors(actual: ColorsOptions | undefined, expected: ColorsOptions) {
	expect(Object.keys(actual ?? {}).sort()).toEqual(Object.keys(expected).sort());
	for (const [key, value] of Object.entries(expected) as [keyof ColorsOptions, string][]) {
		expect(colorDistance(parseRGBA(actual![key]!), parseRGBA(value)), key).toBeLessThan(2);
	}
}

const PM_URL = 'https://example.org/protomaps.json';

/** A glyph server's font list, as `guessOptions` passes it on: the faces these tests carry over. */
const FONT_NAMES = [
	'noto_sans_regular',
	'noto_sans_bold',
	'open_sans_regular',
	'open_sans_semibold',
	'open_sans_bold',
	'fira_sans_regular',
	'fira_sans_regular_italic',
	'fira_sans_bold',
];

describe('deriveOptions — round trips through the package builders', () => {
	it('derives nothing from the default osm() style', () => {
		expect(osmOptions(deriveOptions(osm()))).toEqual({});
	});

	it.each(['gray', 'toner', 'natural-dark', 'colorful-dark'] as const)('recognises the %s theme', (theme) => {
		expect(osmOptions(deriveOptions(osm({ theme })))).toEqual({ theme });
	});

	it('recovers colours, hidden groups, language, label size, terrain and projection', () => {
		const options = osmOptions(
			deriveOptions(
				osm({
					theme: 'natural',
					colors: { water: '#3366CC', roadMotorway: '#CC0000', label: '#112233' },
					layers: { buildings: false, pois: false, land: { rock: false } },
					text: { language: 'de', scale: 1.5, pitchAlignment: 'viewport' },
					features: { terrain: { exaggeration: 2 } },
					projection: 'mercator',
				})
			)
		);
		const { colors, ...rest } = options;
		expectColors(colors, { water: '#3366CC', roadMotorway: '#CC0000', label: '#112233' });
		expect(rest).toEqual({
			theme: 'natural',
			layers: { buildings: false, pois: false, land: { rock: false } },
			text: { language: 'de', scale: 1.5, pitchAlignment: 'viewport' },
			features: { terrain: { exaggeration: 2 } },
			projection: 'mercator',
		});
	});

	it('recovers regular and bold fonts swapped, for osm() and for a satellite overlay', () => {
		const swapped = {
			font: 'noto_sans_bold',
			streets: { refs: { font: 'noto_sans_regular' } },
			pois: { general: { font: 'noto_sans_regular' } },
		};
		expect(osmOptions(deriveOptions(osm({ text: swapped })))).toEqual({ text: swapped });

		// the overlay sets every label in bold by default; here only the refs and POI names stay bold
		const regular = {
			font: 'noto_sans_regular',
			streets: { refs: { font: 'noto_sans_bold' } },
			pois: { general: { font: 'noto_sans_bold' } },
		};
		const overlay = satelliteOptions(deriveOptions(satellite({ osmOverlay: { text: regular } })));
		expect(overlay).toEqual({ osmOverlay: { text: regular } });
	});

	it('recovers the fonts of every topic, including topics no probe reads', () => {
		const text = {
			font: 'fira_sans_regular',
			streets: { refs: { font: 'fira_sans_bold' } },
			water: { font: 'fira_sans_regular_italic' },
			pois: { general: { font: 'fira_sans_bold' } },
		};
		expect(osmOptions(deriveOptions(osm({ text }), {}, FONT_NAMES))).toEqual({ text });
	});

	it('hides a whole branch when all of its groups are hidden', () => {
		const options = osmOptions(deriveOptions(osm({ layers: { labels: false } })));
		expect(options.layers).toEqual({ labels: false });
	});

	it('recovers extruded buildings', () => {
		expect(osmOptions(deriveOptions(osm({ features: { buildings: 'extruded' } }))).features).toEqual({
			buildings: 'extruded',
		});
	});

	it('reads OpenMapTiles and Protomaps styles alike', () => {
		expect(osmOptions(deriveOptions(omt({ theme: 'toner', text: { language: 'en', languageStrict: true } })))).toEqual({
			theme: 'toner',
			text: { language: 'en', languageStrict: true },
		});
		expect(osmOptions(deriveOptions(protomaps({ theme: 'muted-dark', urls: { protomaps: PM_URL } })))).toEqual({
			theme: 'muted-dark',
		});
	});

	it('recovers satellite styles, with and without overlay', () => {
		expect(satelliteOptions(deriveOptions(satellite()))).toEqual({});
		expect(
			satelliteOptions(deriveOptions(satellite({ osmOverlay: false, raster: { saturation: -0.5, contrast: 0.2 } })))
		).toEqual({ osmOverlay: false, raster: { saturation: -0.5, contrast: 0.2 } });

		const overlay = satelliteOptions(
			deriveOptions(satellite({ osmOverlay: { theme: 'colorful', colors: { roadMotorway: '#FF00FF' } } }))
		).osmOverlay as Exclude<SatelliteOptions['osmOverlay'], boolean | undefined>;
		expect(overlay.theme).toBe('colorful');
		expectColors(overlay.colors, { roadMotorway: '#FF00FF' });
	});

	it('reports the probes it read and the layers it did not', () => {
		const style = osm();
		const { report } = deriveOptions(style);
		expect(report.sources).toEqual([
			{ id: 'versatiles-shortbread', type: 'vector', guess: expect.objectContaining({ schema: 'shortbread' }) },
		]);
		expect(report.evidence).toContainEqual({
			probe: 'street-motorway',
			zoom: 14,
			layers: ['street-motorway', 'street-motorway:outline'],
		});
		expect(report.unmatched).toContain('tunnel-street-motorway');
		expect(report.unmatched).not.toContain('street-motorway');
	});
});

// ── foreign styles ──────────────────────────────────────────────────────────────

/** A small OpenMapTiles style in the way third-party styles are written: legacy filters, stop functions. */
function omtStyle(extra: Partial<StyleSpecification> = {}, layers: unknown[] = []): StyleSpecification {
	return {
		version: 8,
		sources: { openmaptiles: { type: 'vector', url: 'https://example.org/tiles.json' } },
		glyphs: 'https://example.org/fonts/{fontstack}/{range}.pbf',
		layers: [
			{ id: 'background', type: 'background', paint: { 'background-color': '#f8f4f0' } },
			{
				id: 'water',
				type: 'fill',
				source: 'openmaptiles',
				'source-layer': 'water',
				filter: ['all', ['!=', 'intermittent', 1]],
				paint: { 'fill-color': 'hsl(210, 67%, 85%)' },
			},
			{
				id: 'road',
				type: 'line',
				source: 'openmaptiles',
				'source-layer': 'transportation',
				filter: ['in', 'class', 'motorway', 'primary'],
				paint: {
					'line-color': '#fc8',
					'line-width': {
						base: 1.2,
						stops: [
							[6, 1],
							[20, 20],
						],
					},
				},
			},
			{
				id: 'place',
				type: 'symbol',
				source: 'openmaptiles',
				'source-layer': 'place',
				layout: { 'text-field': '{name:latin}', 'text-font': ['Metropolis Regular'] },
				paint: { 'text-color': '#333' },
			},
			...layers,
		],
		...extra,
	} as StyleSpecification;
}

describe('deriveOptions — foreign styles', () => {
	it('recognises the schema from the source-layers the style reads', () => {
		const guess = deriveOptions(omtStyle());
		expect(guess.kind).toBe('osm');
		expect(guess.report.sources[0].guess).toMatchObject({ schema: 'openmaptiles' });
	});

	it("prefers the caller's TileJSON", () => {
		const tileJSON = {
			tilejson: '3.0.0',
			tiles: ['https://example.org/{z}/{x}/{y}.pbf'],
			vector_layers: ['ocean', 'land', 'streets', 'water_polygons'].map((id) => ({ id, fields: {} })),
		} as TileJSONSpecification;
		const guess = deriveOptions(omtStyle(), { openmaptiles: tileJSON });
		expect(guess.report.sources[0].guess).toMatchObject({ schema: 'shortbread' });
	});

	it('warns about what it cannot carry over', () => {
		const { report } = deriveOptions(omtStyle({ sprite: 'https://example.org/sprite' }));
		expect(report.warnings).toContainEqual(expect.stringContaining('Metropolis Regular'));
		expect(report.warnings).toContainEqual(expect.stringContaining('icons are not carried over'));
	});

	it('carries over fonts the glyph server has, and only the weight of those it has not', () => {
		const withFont = (font: string[]) =>
			omtStyle({}, [
				{
					id: 'city',
					type: 'symbol',
					source: 'openmaptiles',
					'source-layer': 'place',
					layout: { 'text-field': '{name}', 'text-font': font },
				},
			]);

		// Open Sans is on the server: the place and boundary labels keep their face, and every other topic
		// takes the family, in the weight the style gives its labels
		const openSans = deriveOptions(withFont(['Open Sans Semibold', 'Arial Unicode MS Bold']), {}, FONT_NAMES);
		// the stub's labels keep MapLibre's default size, so a label scale is derived too — not what this is about
		const textWithoutScale = (guess: OptionsGuess) => {
			const { scale, ...text } = osmOptions(guess).text ?? {};
			void scale;
			return text;
		};
		expect(textWithoutScale(openSans)).toEqual({
			font: 'open_sans_bold',
			boundaries: { font: 'open_sans_semibold' },
			places: { font: 'open_sans_semibold' },
		});
		expect(openSans.report.warnings.filter((w) => w.includes('font'))).toEqual([]);

		// Metropolis is not: only the weight carries over, on Noto Sans
		const metropolis = deriveOptions(withFont(['Metropolis Semibold']), {}, FONT_NAMES);
		expect(textWithoutScale(metropolis)).toEqual({ font: 'noto_sans_bold' });
		expect(metropolis.report.warnings).toContainEqual(
			expect.stringContaining('the glyph server does not publish are not carried over (Metropolis Semibold)')
		);

		// without a font list only the target's own Noto Sans is known, so Open Sans is only a weight too
		const unlisted = deriveOptions(withFont(['Open Sans Semibold']));
		expect(textWithoutScale(unlisted)).toEqual({ font: 'noto_sans_bold' });
		expect(unlisted.report.warnings).toContainEqual(
			expect.stringContaining('unknown without the glyph server font list are not carried over (Open Sans Semibold)')
		);

		const noto = deriveOptions(withFont(['Noto Sans Medium']));
		expect(textWithoutScale(noto)).toEqual({});
		expect(noto.report.warnings.filter((w) => w.includes('font'))).toEqual([]);
	});

	it('defaults to mercator, and keeps a projection MapLibre implements', () => {
		expect(osmOptions(deriveOptions(omtStyle())).projection).toBe('mercator');
		expect(osmOptions(deriveOptions(omtStyle({ projection: { type: 'globe' } }))).projection).toBeUndefined();
		const guess = deriveOptions(omtStyle({ projection: { type: 'equal-earth' } } as never));
		expect(osmOptions(guess).projection).toBeUndefined();
		expect(guess.report.warnings).toContainEqual(expect.stringContaining('equal-earth'));
	});

	it('reads light, sky, terrain and hillshade', () => {
		const style = omtStyle(
			{
				light: { anchor: 'map', position: [1.5, 90, 30], color: '#ffeedd', intensity: 0.4 },
				sky: { 'sky-color': '#ff0000', 'atmosphere-blend': 0.5 },
				terrain: { source: 'dem', exaggeration: 1 },
			},
			[{ id: 'hills', type: 'hillshade', source: 'dem', paint: { 'hillshade-exaggeration': 0.3 } }]
		);
		const options = osmOptions(deriveOptions(style));
		// the polar angle 30° is an altitude of 60°, which is what `sun: true` resolves to, so it is not written
		expect(options.sun).toEqual({ direction: 90, anchor: 'map', color: '#ffeedd', intensity: 0.4 });
		expect(options.sky).toEqual({ skyColor: '#ff0000', atmosphereBlend: 0.5 });
		expect(options.features).toMatchObject({ terrain: true, hillshade: { exaggeration: 0.3 } });
	});

	// MapLibre's `light.position` is `[radial, azimuthal, polar]`. A shorter array passed the old
	// `every(isNumber)` check vacuously, so `90 - position[2]` was `NaN` — which `minimizeOptions`
	// could not drop (`JSON.stringify(NaN)` is `"null"`) and which built an unusable style.
	it('reads nothing from a malformed light.position rather than deriving NaN', () => {
		for (const position of [[1.15, 210], [1.15], [], [1.15, 210, 30, 7]]) {
			const options = osmOptions(deriveOptions(omtStyle({ light: { anchor: 'map', position } as never })));
			const sun = options.sun;
			expect(JSON.stringify(sun) ?? '', JSON.stringify(position)).not.toContain('null');
			expect(typeof sun === 'object' && 'altitude' in sun, JSON.stringify(position)).toBe(false);
		}
	});

	it('still builds a usable style from a light it could not read', () => {
		const guess = deriveOptions(omtStyle({ light: { anchor: 'map', position: [1.15, 210] } as never }));
		const style = osm(osmOptions(guess));
		expect(JSON.stringify(style.light ?? {})).not.toContain('null');
	});

	it('reads the language of legacy tokens and expressions', () => {
		const labels = (textField: unknown) =>
			omtStyle({}, [
				{
					id: 'city',
					type: 'symbol',
					source: 'openmaptiles',
					'source-layer': 'place',
					filter: ['==', 'class', 'city'],
					layout: { 'text-field': textField },
				},
			]);
		// the stub's labels keep MapLibre's default size, so a label scale is derived too — not what this is about
		const language = (style: StyleSpecification) => {
			const { scale, ...text } = osmOptions(deriveOptions(style)).text ?? {};
			void scale;
			return Object.keys(text).length > 0 ? text : undefined;
		};
		expect(language(labels('{name_fr}'))).toEqual({ language: 'fr', languageStrict: true });
		expect(language(labels(['coalesce', ['get', 'name:it'], ['get', 'name']]))).toEqual({
			language: 'it',
		});
		expect(language(labels('{name}'))).toBeUndefined();

		const unsupported = deriveOptions(labels('{name:ja}'));
		expect(language(labels('{name:ja}'))).toBeUndefined();
		expect(unsupported.report.warnings).toContainEqual(expect.stringContaining('"ja"'));
	});

	it('is a satellite style only when the imagery is not covered by fills', () => {
		const imagery = { id: 'imagery', type: 'raster', source: 'sat', paint: { 'raster-saturation': -0.2 } };
		const sources = {
			openmaptiles: { type: 'vector', url: 'https://example.org/tiles.json' },
			sat: { type: 'raster', tiles: ['https://example.org/{z}/{x}/{y}.jpg'] },
		};
		const base = omtStyle({ sources } as never);

		const under = { ...base, layers: [base.layers[0], imagery, ...base.layers.slice(1)] } as StyleSpecification;
		expect(deriveOptions(under).kind).toBe('osm');

		const over = {
			...base,
			layers: [...base.layers.slice(0, 2), imagery, ...base.layers.slice(2)],
		} as StyleSpecification;
		const options = satelliteOptions(deriveOptions(over));
		expect(options.raster).toEqual({ saturation: -0.2 });
		expect(options.osmOverlay).toBeDefined();

		const early = { ...imagery, maxzoom: 7 };
		const shading = {
			...base,
			layers: [...base.layers.slice(0, 2), early, ...base.layers.slice(2)],
		} as StyleSpecification;
		expect(deriveOptions(shading).kind).toBe('osm');

		const faint = { ...imagery, paint: { 'raster-opacity': 0.3 } };
		const translucent = { ...base, layers: [...base.layers, faint] } as StyleSpecification;
		expect(deriveOptions(translucent).kind).toBe('osm');
	});

	it('gives up on styles it cannot read', () => {
		const unknown = deriveOptions({
			version: 8,
			sources: { x: { type: 'vector', url: 'https://example.org/x.json' } },
			layers: [{ id: 'l', type: 'fill', source: 'x', 'source-layer': 'mystery' }],
		} as StyleSpecification);
		expect(unknown.kind).toBe('unknown');
		expect(unknown.report.warnings).toContainEqual(expect.stringContaining('no known schema'));

		const invalid = deriveOptions({ layers: 'nope' } as never);
		expect(invalid.kind).toBe('unknown');
		expect(invalid.report.warnings).toContainEqual(expect.stringContaining('not a MapLibre style'));
	});
});

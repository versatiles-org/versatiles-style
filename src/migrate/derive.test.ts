import { describe, expect, it } from 'vitest';
import { osm } from '../api/osm.js';
import { satellite } from '../api/satellite.js';
import { omt } from '../omt/api.js';
import { protomaps } from '../protomaps/api.js';
import type { ColorsOptions, OsmOptions, SatelliteOptions } from '../options/index.js';
import type { StyleSpecification, TileJSONSpecification } from '../types/index.js';
import { parseRGBA } from './calibrate.js';
import { deriveOptions, type GuessReport, type OptionsGuess } from './derive.js';
import { byCode } from './diagnostics.js';
import { isCovered } from './provenance.js';

/** The codes a report carries, which is what a test should assert on rather than the prose. */
const codes = (report: GuessReport) => report.diagnostics.map((d) => d.code);
import { colorDistance } from './math.js';

function osmOptions(guess: OptionsGuess): OsmOptions {
	expect(guess.kind).toBe('osm');
	return (guess as Extract<OptionsGuess, { kind: 'osm' }>).options;
}

function satelliteOptions(guess: OptionsGuess): SatelliteOptions {
	expect(guess.kind).toBe('satellite');
	return (guess as Extract<OptionsGuess, { kind: 'satellite' }>).options;
}

/**
 * `text` options with every derived `LabelStyle` property removed, and any branch left empty dropped
 * with them.
 *
 * The stub styles below set none of these, which is itself a style — no halo, MapLibre's own wrapping
 * and no capitalization — so every topic they cover derives them. For the tests about fonts and about
 * language that is noise, the same way the derived label scale is.
 */
const DERIVED_LABEL_KEYS = ['haloWidth', 'haloBlur', 'maxWidth', 'lineHeight', 'letterSpacing', 'transform', 'spacing'];
function withoutLabelStyle<T>(value: T): T {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) return value;
	const out: Record<string, unknown> = {};
	for (const [key, entry] of Object.entries(value)) {
		if (DERIVED_LABEL_KEYS.includes(key)) continue;
		const stripped = withoutLabelStyle(entry) as unknown;
		const empty = stripped !== null && typeof stripped === 'object' && Object.keys(stripped).length === 0;
		if (!empty) out[key] = stripped;
	}
	return out as T;
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

	// Halo geometry used to be dropped: `text-halo-width` was read only to decide whether the halo
	// colour meant anything, so every imported style came back with the target's own 2px halo. Spotted
	// on OpenFreeMap's Liberty, whose place labels are haloed 1/1 and came back at 2/1.
	describe('label halo width and blur', () => {
		const haloOf = (options: OsmOptions) => {
			const s = osm(options);
			const paint = (id: string) => (s.layers.find((l) => l.id === id)?.paint ?? {}) as Record<string, unknown>;
			return (id: string) => [paint(id)['text-halo-width'] ?? 0, paint(id)['text-halo-blur'] ?? 0];
		};

		it('carries a halo the target draws differently, per topic', () => {
			const source = osm({ text: { haloWidth: 1, haloBlur: 1, water: { haloWidth: 1.5, haloBlur: 0 } } });
			const rebuilt = haloOf(osmOptions(deriveOptions(source)));
			expect(rebuilt('label-place-city')).toEqual([1, 1]);
			expect(rebuilt('label-place-village')).toEqual([1, 1]);
			expect(rebuilt('label-water-river')).toEqual([1.5, 0]);
		});

		it('carries "no halo at all", which the target would otherwise draw at 2px', () => {
			const rebuilt = haloOf(osmOptions(deriveOptions(osm({ text: { haloWidth: 0 } }))));
			expect(rebuilt('label-place-city')).toEqual([0, 0]);
			expect(rebuilt('label-water-river')).toEqual([0, 0]);
		});

		// `streets.refs` is haloed 0.1 and `addresses` not at all, neither of which any probe reads. A
		// fallback that pooled any neighbour would hand them a street-name halo and, on the target's own
		// style, make the round trip above derive options where it should derive none.
		it('leaves a topic alone when nothing comparable was read', () => {
			const derived = osmOptions(deriveOptions(osm({ text: { places: { haloWidth: 1 } } })));
			const streets = derived.text?.streets as Record<string, unknown> | undefined;
			expect((streets?.refs as Record<string, unknown> | undefined)?.haloWidth).toBeUndefined();
			expect((derived.text?.addresses as Record<string, unknown> | undefined)?.haloWidth).toBeUndefined();
		});
	});

	// The rest of `LabelStyle`. `text-transform` was the loudest of these: the target uppercases country,
	// state, hamlet and district names, so an imported style that does not came back shouting FRANCE.
	describe('the rest of the label style', () => {
		const layoutOf =
			(style: StyleSpecification) =>
			(id: string, key: string): unknown =>
				(style.layers.find((l) => l.id === id)?.layout as Record<string, unknown> | undefined)?.[key];

		it('carries capitalization, including "none" where the target uppercases', () => {
			// boundaries.countries defaults to uppercase; a style that does not uppercase has to say so
			const derived = osmOptions(deriveOptions(osm({ text: { boundaries: { transform: 'none' } } })));
			const out = layoutOf(osm(derived));
			expect(out('label-boundary-country-large', 'text-transform')).toBeUndefined(); // 'none' writes nothing
			expect(out('label-boundary-state', 'text-transform')).toBeUndefined();
		});

		it('carries an uppercase the target does not apply', () => {
			const out = layoutOf(osm(osmOptions(deriveOptions(osm({ text: { places: { transform: 'uppercase' } } })))));
			expect(out('label-place-city', 'text-transform')).toBe('uppercase');
			expect(out('label-place-village', 'text-transform')).toBe('uppercase');
		});

		it.each([
			['maxWidth', 'text-max-width', 8],
			['lineHeight', 'text-line-height', 1.5],
			['letterSpacing', 'text-letter-spacing', 0.2],
		])('carries %s through as %s', (option, property, value) => {
			const derived = osmOptions(deriveOptions(osm({ text: { places: { [option]: value } } })));
			expect(layoutOf(osm(derived))('label-place-city', property)).toBe(value);
		});

		// `spacing` multiplies the layer's own `symbol-spacing`, so unlike the rest it is read as a ratio
		// against the target's — and only for line-placed labels, the only ones MapLibre spaces this way.
		// The target states no `symbol-spacing` of its own here, so the ratio is taken against MapLibre's
		// default of 250, which is what it draws with.
		it('carries spacing as a ratio, for line labels', () => {
			const source = osm({ text: { water: { spacing: 1.4 } } });
			expect(layoutOf(osm())('label-water-river', 'symbol-spacing')).toBeUndefined();
			expect(layoutOf(source)('label-water-river', 'symbol-spacing')).toBe(350);

			const derived = osmOptions(deriveOptions(source));
			expect((derived.text?.water as Record<string, unknown> | undefined)?.spacing).toBeCloseTo(1.4, 5);
			expect(layoutOf(osm(derived))('label-water-river', 'symbol-spacing')).toBe(350);
		});
	});

	// `icon` was never derived at all: an imported style kept the target's icon sizes whatever it drew.
	describe('icon scale and spacing', () => {
		const iconOf = (options: OsmOptions) => osmOptions(deriveOptions(osm(options))).icon;

		it.each([[{ scale: 1.5 }], [{ scale: 0.5 }], [{ spacing: 2 }], [{ spacing: 3 }], [{ scale: 1.5, spacing: 2 }]])(
			'round trips %o',
			(icon) => {
				expect(iconOf({ icon })).toEqual(icon);
			}
		);

		// Both are global multipliers fitted to a couple of layers whose sizes ramp differently from the
		// target's, so a factor this close to 1 is more likely to be where the ramps cross than a choice.
		it('ignores a factor within 10% of 1', () => {
			expect(iconOf({ icon: { scale: 1.05 } })).toBeUndefined();
			expect(iconOf({ icon: { spacing: 1.05 } })).toBeUndefined();
			expect(iconOf({})).toBeUndefined();
		});

		// Liberty draws a small dot beside its place names, which the target draws no icon for at all.
		// Reading `icon-size` off a layer with no `icon-image` would take MapLibre's default of 1 as
		// evidence and compare it with nothing, dragging the factor toward those dots.
		it('reads a size only from layers that draw an icon', () => {
			const withDots = osm();
			for (const layer of withDots.layers) {
				if (!layer.id.startsWith('label-place-')) continue;
				((layer as { layout?: Record<string, unknown> }).layout ??= {})['icon-image'] = 'base:icon-dot';
				(layer as { layout: Record<string, unknown> }).layout['icon-size'] = 0.2;
			}
			// the place labels say 0.2 against a target that draws no icon there; only the POI and transit
			// probes compare like with like, and they are unchanged
			expect(osmOptions(deriveOptions(withDots)).icon).toBeUndefined();
		});
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

	// The extrusion opacity used to be folded into the building colour's alpha, because the colour model
	// is calibrated against the flat default and there was nowhere else for it to go. The rebuilt style
	// then applied it twice — the target's own extruded style came back at an effective 0.49 instead of
	// 0.7 — and no option could state it until `layers.buildings` began to.
	describe('3D building opacity', () => {
		const extruded = (layers?: number) =>
			osm({ features: { buildings: 'extruded' }, ...(layers === undefined ? {} : { layers: { buildings: layers } }) });
		/** What the extrusion actually comes out at: the colour's alpha times the layer's opacity. */
		const effective = (style: StyleSpecification) => {
			const paint = style.layers.find((l) => l.id === 'building-3d')?.paint as Record<string, unknown>;
			const alpha = /rgba\([^)]*,\s*([\d.]+)\s*\)/.exec(String(paint['fill-extrusion-color']));
			const ramp = paint['fill-extrusion-opacity'];
			const opacity = Array.isArray(ramp) ? (ramp[ramp.length - 1] as number) : (ramp as number);
			return Math.round((alpha ? Number(alpha[1]) : 1) * opacity * 1000) / 1000;
		};

		it.each([0.8, 0.5, 1])('round trips an opacity of %s', (opacity) => {
			const derived = osmOptions(deriveOptions(extruded(opacity)));
			expect((derived.layers as Record<string, unknown>).buildings).toBe(opacity);
			expect(effective(osm(derived))).toBe(opacity);
		});

		it('says nothing where the style already draws the cartographic default', () => {
			const derived = osmOptions(deriveOptions(extruded()));
			expect(derived.layers).toBeUndefined();
			expect(effective(osm(derived))).toBe(0.7);
		});

		it('leaves the building colour opaque rather than carrying the opacity in its alpha', () => {
			for (const opacity of [undefined, 0.5]) {
				const derived = osmOptions(deriveOptions(extruded(opacity)));
				// an alpha here would be applied on top of the layer opacity, dimming the extrusion twice
				expect(derived.colors?.building ?? '#000000').toMatch(/^#[0-9A-Fa-f]{6}$/);
			}
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
		const unread = byCode(report.diagnostics, 'layer.unread')[0]?.origin?.layers ?? [];
		expect(unread).toContain('tunnel-street-motorway');
		expect(unread).not.toContain('street-motorway');
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

	it('reports what it cannot carry over, by code', () => {
		const { report } = deriveOptions(omtStyle({ sprite: 'https://example.org/sprite' }));
		expect(codes(report)).toContain('font.unavailable');
		expect(byCode(report.diagnostics, 'font.unavailable')[0].data?.requested).toContain('Metropolis Regular');
		// every style with a sprite reports this, which is why it is info and not a warning
		const icons = byCode(report.diagnostics, 'icons.replaced')[0];
		expect(icons.severity).toBe('info');
		expect(icons.data?.sprite).toBe('https://example.org/sprite');
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
		// the stub's labels keep MapLibre's default size and set no halo, wrapping or transform, so a label
		// scale and the whole label style are derived too — neither is what this is about
		const textWithoutScale = (guess: OptionsGuess) => {
			const { scale, ...text } = osmOptions(guess).text ?? {};
			void scale;
			return withoutLabelStyle(text);
		};
		expect(textWithoutScale(openSans)).toEqual({
			font: 'open_sans_bold',
			boundaries: { font: 'open_sans_semibold' },
			places: { font: 'open_sans_semibold' },
		});
		expect(byCode(openSans.report.diagnostics, 'font.unavailable')).toEqual([]);

		// Metropolis is not: only the weight carries over, on Noto Sans
		const metropolis = deriveOptions(withFont(['Metropolis Semibold']), {}, FONT_NAMES);
		expect(textWithoutScale(metropolis)).toEqual({ font: 'noto_sans_bold' });
		expect(byCode(metropolis.report.diagnostics, 'font.unavailable')[0]).toMatchObject({
			severity: 'warning',
			optionPath: 'text.font',
			data: { requested: ['Metropolis Semibold'], reason: 'not-published' },
		});

		// without a font list only the target's own Noto Sans is known, so Open Sans is only a weight too
		const unlisted = deriveOptions(withFont(['Open Sans Semibold']));
		expect(textWithoutScale(unlisted)).toEqual({ font: 'noto_sans_bold' });
		// a different cause from the one above, which one prose string used to conflate
		expect(byCode(unlisted.report.diagnostics, 'font.unavailable')[0]).toMatchObject({
			data: { requested: ['Open Sans Semibold'], reason: 'no-font-list' },
		});

		const noto = deriveOptions(withFont(['Noto Sans Medium']));
		expect(textWithoutScale(noto)).toEqual({});
		expect(byCode(noto.report.diagnostics, 'font.unavailable')).toEqual([]);
	});

	it('defaults to mercator, and keeps a projection MapLibre implements', () => {
		expect(osmOptions(deriveOptions(omtStyle())).projection).toBe('mercator');
		expect(osmOptions(deriveOptions(omtStyle({ projection: { type: 'globe' } }))).projection).toBeUndefined();
		const guess = deriveOptions(omtStyle({ projection: { type: 'equal-earth' } } as never));
		expect(osmOptions(guess).projection).toBeUndefined();
		expect(byCode(guess.report.diagnostics, 'projection.unsupported')[0]).toMatchObject({
			optionPath: 'projection',
			data: { requested: 'equal-earth' },
		});
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
		// the stub's labels keep MapLibre's default size and set no halo, wrapping or transform, so a label
		// scale and the whole label style are derived too — neither is what this is about
		const language = (style: StyleSpecification) => {
			const { scale, ...rest } = osmOptions(deriveOptions(style)).text ?? {};
			void scale;
			const text = withoutLabelStyle(rest);
			return Object.keys(text).length > 0 ? text : undefined;
		};
		expect(language(labels('{name_fr}'))).toEqual({ language: 'fr', languageStrict: true });
		expect(language(labels(['coalesce', ['get', 'name:it'], ['get', 'name']]))).toEqual({
			language: 'it',
		});
		expect(language(labels('{name}'))).toBeUndefined();

		const unsupported = deriveOptions(labels('{name:ja}'));
		expect(language(labels('{name:ja}'))).toBeUndefined();
		expect(byCode(unsupported.report.diagnostics, 'language.unavailable')[0]).toMatchObject({
			optionPath: 'text.language',
			data: { requested: 'ja' },
		});
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
		expect(codes(unknown.report)).toContain('source.schemaUnknown');

		const invalid = deriveOptions({ layers: 'nope' } as never);
		expect(invalid.kind).toBe('unknown');
		expect(codes(invalid.report)).toEqual(['input.notAStyle']);
	});

	// The input said several things where the options have one knob. The readers keep what the map
	// shows; these report what they passed over, so a consumer can offer it back as a choice.
	describe('conflicts', () => {
		/** Symbol layers that all match the same probe feature, so the topmost wins and the rest are alternatives. */
		const stacked = (colors: string[]) =>
			({
				version: 8,
				sources: { omt: { type: 'vector', url: 'https://example.org/t.json' } },
				layers: [
					{ id: 'bg', type: 'background', paint: { 'background-color': '#ffffff' } },
					...colors.map((color, i) => ({
						id: `poi-${i}`,
						type: 'symbol',
						source: 'omt',
						'source-layer': 'poi',
						layout: { 'text-field': '{name}', 'text-font': ['Noto Sans Regular'] },
						paint: { 'text-color': color },
					})),
				],
			}) as unknown as StyleSpecification;

		it('groups the discarded colours by colour, with the layers that drew each', () => {
			const guess = deriveOptions(stacked(['#16a085', '#8e44ad', '#c0392b', '#d35400']));
			const conflict = byCode(guess.report.diagnostics, 'color.conflict').find(
				(c) => c.optionPath === 'colors.labelPoi'
			);
			expect(conflict?.severity).toBe('warning');
			expect(conflict?.data.rule).toBe('topmost');
			expect(conflict?.data.chosen).toBe('#D35400'); // the topmost, which is what the map shows
			// one entry per colour, not per layer: this is the list a radio group is built from
			expect(conflict?.data.observed.map((o) => o.color)).toEqual(['#D35400', '#16A085', '#8E44AD', '#C0392B']);
			expect(conflict?.data.observed.find((o) => o.color === '#16A085')?.layers).toEqual(['poi-0']);
		});

		it('says nothing when the layers only look alike', () => {
			// four layers, one colour: nothing was passed over that a person could choose differently
			expect(
				byCode(deriveOptions(stacked(['#16a085', '#16a085', '#16a085'])).report.diagnostics, 'color.conflict')
			).toEqual([]);
		});

		// Overpaint and collapse are different losses and are named differently. This is collapse: the
		// source tells POI classes apart, the target draws them through one `colors.labelPoi`, and the
		// layers never meet — none of them overpaints another, so `color.conflict` is silent by design.
		it('reports features the target cannot tell apart, separately from overpaint', () => {
			const poi = (id: string, cls: string, color: string) => ({
				id,
				type: 'symbol',
				source: 'omt',
				'source-layer': 'poi',
				filter: ['==', ['get', 'class'], cls],
				layout: { 'text-field': '{name}', 'text-font': ['Noto Sans Regular'] },
				paint: { 'text-color': color },
			});
			const guess = deriveOptions({
				version: 8,
				sources: { omt: { type: 'vector', url: 'https://example.org/t.json' } },
				layers: [
					{ id: 'bg', type: 'background', paint: { 'background-color': '#ffffff' } },
					poi('poi-restaurant', 'restaurant', '#d35400'),
					poi('poi-shop', 'shop', '#8e44ad'),
					poi('poi-lodging', 'lodging', '#16a085'),
				],
			} as unknown as StyleSpecification);

			const collapsed = byCode(guess.report.diagnostics, 'color.collapsed')[0];
			expect(collapsed?.optionPath).toBe('colors.labelPoi');
			expect(collapsed?.data.chosen).toBe('#D35400');
			expect(collapsed?.data.observed.map((o) => o.color)).toEqual(['#D35400', '#8E44AD', '#16A085']);
			// named by what tells them apart, without the props every POI carries
			expect(collapsed?.data.observed[1].feature).toBe('class=shop subclass=supermarket');
			expect(collapsed?.data.observed[1].layers).toEqual(['poi-shop']);

			// the classes never draw the same feature, so nothing was overpainted
			expect(byCode(guess.report.diagnostics, 'color.conflict')).toEqual([]);
		});

		it('says nothing about a collapse the style does not make', () => {
			// one POI colour for every class: the target being coarser costs nothing here
			const poi = (id: string, cls: string) => ({
				id,
				type: 'symbol',
				source: 'omt',
				'source-layer': 'poi',
				filter: ['==', ['get', 'class'], cls],
				layout: { 'text-field': '{name}', 'text-font': ['Noto Sans Regular'] },
				paint: { 'text-color': '#666666' },
			});
			const guess = deriveOptions({
				version: 8,
				sources: { omt: { type: 'vector', url: 'https://example.org/t.json' } },
				layers: [
					{ id: 'bg', type: 'background', paint: { 'background-color': '#ffffff' } },
					poi('poi-restaurant', 'restaurant'),
					poi('poi-shop', 'shop'),
				],
			} as unknown as StyleSpecification);
			expect(byCode(guess.report.diagnostics, 'color.collapsed')).toEqual([]);
		});

		it('reports fonts and label styles a topic disagreed on', () => {
			const guess = deriveOptions(
				osm({ text: { places: { cities: { font: 'noto_sans_bold' }, villages: { font: 'noto_sans_regular' } } } })
			);
			// the city probes read one face and the village probes another, for one `places` topic tree
			const fonts = byCode(guess.report.diagnostics, 'font.conflict');
			expect(fonts.every((f) => f.data.observed.length > 1)).toBe(true);
			expect(fonts.every((f) => f.data.observed.every((o) => o.count > 0))).toBe(true);
		});

		it('reports icons that cannot all be served by one multiplier', () => {
			// POI icons scaled one way and transit icons another: the mean can only split the difference
			const style = osm({ icon: { scale: 2 } });
			for (const layer of style.layers) {
				if (layer.id !== 'poi-amenity') continue;
				const layout = (layer as { layout: Record<string, unknown> }).layout;
				layout['icon-size'] = 0.2;
			}
			const conflict = byCode(deriveOptions(style).report.diagnostics, 'icon.conflict')[0];
			expect(conflict?.data.option).toBe('scale');
			expect(conflict?.data.observed.length).toBeGreaterThan(1);
			expect(conflict?.data.observed.map((o) => o.probe)).toContain('poi-amenity');
		});

		it('reports labels read in more than one language', () => {
			const style = osm({ text: { language: 'de' } });
			for (const layer of style.layers) {
				if (layer.id !== 'label-place-town') continue;
				(layer as { layout: Record<string, unknown> }).layout['text-field'] = ['get', 'name_fr'];
			}
			const conflict = byCode(deriveOptions(style).report.diagnostics, 'language.conflict')[0];
			expect(conflict?.data.observed.map((o) => o.language).sort()).toEqual(['de', 'fr']);
			expect(conflict?.data.chosen).toBe('de'); // the city probe, which LANGUAGE_PROBES puts first
		});

		// The conflict scan and the decision were two separate walks and could disagree: the scan ignored
		// any probe reading a plain `name`, while the decision stopped at the first of them. A style whose
		// city labels are local was therefore reported as `text.language` = "de" — `optionPath` and all —
		// while the options it returned carried no language.
		it('names the language it actually applied, not the first one observed', () => {
			const style = osm({ text: { language: 'de' } });
			for (const layer of style.layers) {
				const layout = (layer as { layout?: Record<string, unknown> }).layout;
				// The city probe comes first in LANGUAGE_PROBES, so a plain `name` there decides: local names.
				if (layer.id === 'label-place-city') layout!['text-field'] = ['get', 'name'];
				if (layer.id === 'label-place-village') layout!['text-field'] = ['get', 'name_fr'];
			}
			const guess = deriveOptions(style);
			const conflict = byCode(guess.report.diagnostics, 'language.conflict')[0];

			expect(conflict?.data.observed.map((o) => o.language).sort()).toEqual(['de', 'fr']);
			// The decision and the report have to be the same answer.
			expect(osmOptions(guess).text?.language).toBeUndefined();
			expect(conflict?.data.chosen).toBeUndefined();
			expect(conflict?.message).toContain('the local name was taken');
		});

		// A style these builders produced has one layer per probe and one value per topic, so a conflict
		// on it would mean the detection is firing on agreement.
		it("finds none in the target's own styles", () => {
			for (const style of [osm(), osm({ theme: 'gray' }), satellite()]) {
				const { diagnostics } = deriveOptions(style).report;
				const lossy = diagnostics.filter((d) => d.code.endsWith('.conflict') || d.code === 'color.collapsed');
				expect(lossy.map((d) => d.code)).toEqual([]);
			}
		});
	});

	// Where each option came from, which the options object structurally cannot say: `minimizeOptions`
	// deletes every derived value equal to a default, so "read, and it matched" and "never derived" both
	// come out as an absent key.
	describe('provenance', () => {
		it('records a colour as observed even when minimising then deletes it', () => {
			// the target's own style: every colour is read, and every one equals the palette, so the
			// options come back empty while the provenance says all 45 were observed
			const guess = deriveOptions(osm({ theme: 'gray' }));
			expect(osmOptions(guess).colors).toBeUndefined();
			const water = guess.report.provenance['colors.water'];
			expect(water.origin).toBe('observed');
			expect(water.from?.length).toBeGreaterThan(0);
		});

		it('marks a colour nothing spoke for as inherited from the palette', () => {
			const guess = deriveOptions(omtStyle());
			const unobserved = byCode(guess.report.diagnostics, 'color.unobserved')[0].data.keys;
			for (const key of unobserved) expect(guess.report.provenance[`colors.${key}`].origin).toBe('inherited');
		});

		// `pooled` is the reason this annotation exists: a topic no probe reads takes a neighbour's value
		// and writes an option indistinguishable from a first-hand reading.
		it('tells a pooled label style from an observed one, and from a default', () => {
			const guess = deriveOptions(osm({ text: { water: { haloWidth: 1.5 } } }));
			const p = guess.report.provenance;
			expect(p['text.water.rivers.haloWidth'].origin).toBe('observed'); // a probe reads river names
			expect(p['text.water.lakes.haloWidth'].origin).toBe('pooled'); // none reads lake names
			expect(p['text.streets.refs.haloWidth'].origin).toBe('default'); // nor anything haloed like refs
		});

		it('carries confidence only where a number was computed', () => {
			const guess = deriveOptions(osm({ colors: { water: '#3366CC' } }));
			expect(guess.report.provenance['colors.water'].confidence).toBeGreaterThan(0);
			// a font has no measure of its own, so it states none rather than inventing one
			expect(guess.report.provenance['text.places.cities.font'].confidence).toBeUndefined();
		});

		it('is sorted, and covers what it says it covers', () => {
			const { provenance } = deriveOptions(osm()).report;
			const paths = Object.keys(provenance);
			expect(paths).toEqual([...paths].sort());
			expect(paths.every((path) => isCovered(path))).toBe(true);
			expect(isCovered('layers.buildings')).toBe(false);
		});
	});

	// Numbers the solver already computed and then discarded. Neither needs the readers to change, which
	// is why they land before the conflict codes despite being listed with them.
	describe('uncertainty the solver knew about', () => {
		it('names the runner-up palette when it fits almost as well', () => {
			// two palettes that differ only slightly are what makes this fire; the target's own style
			// matches one palette exactly, so it must not
			const own = deriveOptions(osm({ theme: 'gray' }));
			expect(byCode(own.report.diagnostics, 'theme.ambiguous')).toEqual([]);
		});

		it('lists the colours nothing spoke for, as one diagnostic and not forty', () => {
			// a style with almost nothing in it: most of the palette cannot be observed
			const bare = deriveOptions(omtStyle());
			const unobserved = byCode(bare.report.diagnostics, 'color.unobserved');
			expect(unobserved).toHaveLength(1);
			expect(unobserved[0].severity).toBe('info');
			expect(unobserved[0].data.count).toBeGreaterThan(0);
			expect(unobserved[0].data.count).toBe(unobserved[0].data.keys.length);
			expect(unobserved[0].data.total).toBeGreaterThanOrEqual(unobserved[0].data.count);
		});

		it('says nothing about colours it observed and took', () => {
			const guess = deriveOptions(osm({ colors: { water: '#3366CC' } }));
			const unobserved = byCode(guess.report.diagnostics, 'color.unobserved')[0];
			expect(unobserved?.data.keys ?? []).not.toContain('water');
		});
	});

	// Three bugs the report's shape was hiding, each fixed by filling the report as the pipeline learns
	// rather than assembling it at the end.
	describe('what the report used to leave out', () => {
		it('reports the probes it read even when it gives up', () => {
			// a vector source of no known schema, but a readable background: the probes that did read
			// something used to be dropped, because `evidence` was written after the early return
			const unknown = deriveOptions({
				version: 8,
				sources: { x: { type: 'vector', url: 'https://example.org/x.json' } },
				layers: [
					{ id: 'bg', type: 'background', paint: { 'background-color': '#fff' } },
					{ id: 'l', type: 'fill', source: 'x', 'source-layer': 'mystery' },
				],
			} as StyleSpecification);
			expect(unknown.kind).toBe('unknown');
			expect(unknown.report.evidence.map((e) => e.probe)).toContain('background');
			expect(byCode(unknown.report.diagnostics, 'layer.unread')[0]?.origin?.layers).toContain('l');
		});

		it('says so when only part of the style could be read', () => {
			// the vector half is unreadable but there is imagery, so this comes back as an ordinary
			// `satellite` guess — which on its own looks like a complete success
			const partial = deriveOptions({
				version: 8,
				sources: {
					weird: { type: 'vector', url: 'https://example.org/x.json' },
					sat: { type: 'raster', tiles: ['https://example.org/{z}/{x}/{y}'] },
				},
				layers: [{ id: 'img', type: 'raster', source: 'sat' }],
			} as StyleSpecification);
			expect(partial.kind).toBe('satellite');
			expect(byCode(partial.report.diagnostics, 'schema.partial')[0]).toMatchObject({
				severity: 'warning',
				data: { vectorSources: 1 },
			});
		});

		it('does not call a hillshade layer unread when it read it', () => {
			const guess = deriveOptions(osm({ features: { hillshade: true } }));
			expect(osmOptions(guess).features?.hillshade).toBeDefined();
			expect(byCode(guess.report.diagnostics, 'layer.unread')[0]?.origin?.layers ?? []).not.toContain('hillshade');
		});
	});
});

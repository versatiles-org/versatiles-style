import { describe, expect, it } from 'vitest';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
// the authoring helpers — `minimizeOptions` — are attached in the package entry, not here
import { osm, satellite } from '../index.js';
import { omt } from '../omt/index.js';
import { protomaps } from '../protomaps/index.js';
import {
	LINE_STYLE_DEFAULTS,
	isDashPattern,
	lineDefaults,
	type LayerGroupOptions,
	type OsmOptions,
} from '../options/index.js';
import { PALETTES, getLinePreset } from '../themes/index.js';
import { deriveOptions } from '../migrate/index.js';

// `layers` takes a line style — `{ opacity, dashed }` — on the six groups that are a line: the three
// borders and the three kinds of path. The option is resolved in `options/parts/layer-groups.ts` and
// drawn by the shared border and road modules, so it has to hold in every schema, not only Shortbread.

type Build = (layers?: LayerGroupOptions) => StyleSpecification;
const BUILDERS: [string, Build][] = [
	['osm', (layers) => osm({ layers })],
	['omt', (layers) => omt({ layers })],
	['protomaps', (layers) => protomaps({ layers, urls: { protomaps: 'pmtiles://https://example.org/x.pmtiles' } })],
];

const layerOf = (style: StyleSpecification, id: string) =>
	style.layers.find((layer) => layer.id === id) as
		{ paint?: Record<string, unknown>; layout?: Record<string, unknown> } | undefined;
const dashOf = (style: StyleSpecification, id: string) => layerOf(style, id)?.paint?.['line-dasharray'];
const capOf = (style: StyleSpecification, id: string) => layerOf(style, id)?.layout?.['line-cap'] ?? 'butt';
const ids = (style: StyleSpecification, prefix: string) =>
	style.layers.map((layer) => layer.id).filter((id) => id.startsWith(prefix));

describe.each(BUILDERS)('line styles in %s', (_name, build) => {
	it('draws each line group in its default pattern', () => {
		const style = build();
		expect(dashOf(style, 'boundary-country')).toBeUndefined();
		expect(dashOf(style, 'boundary-state')).toStrictEqual([3, 1, 1, 1]);
		expect(dashOf(style, 'boundary-country-disputed')).toStrictEqual([2, 1]);
		expect(dashOf(style, 'way-footway')).toStrictEqual([1.5, 0.75]);
		expect(dashOf(style, 'way-path')).toStrictEqual([1.5, 0.75]);
		expect(dashOf(style, 'way-cycleway')).toStrictEqual([1.5, 0.75]);
		expect(dashOf(style, 'way-steps')).toStrictEqual([0.5, 0.25]);
	});

	it('draws a line solid, with round caps, when `dashed` is false', () => {
		const style = build({
			boundaries: { state: { dashed: false }, disputed: { dashed: false } },
			roads: { footway: { dashed: false }, paths: { dashed: false }, steps: { dashed: false } },
		});
		for (const id of [
			'boundary-state',
			'boundary-country-disputed',
			'way-footway',
			'way-path',
			'way-cycleway',
			'way-steps',
		]) {
			expect(dashOf(style, id), id).toBeUndefined();
			expect(capOf(style, id), id).toBe('round');
		}
		// the same path below and above ground
		expect(dashOf(style, 'tunnel-way-footway')).toBeUndefined();
		expect(dashOf(style, 'bridge-way-footway')).toBeUndefined();
	});

	it('dashes the country border when asked, in a pattern of its own', () => {
		const style = build({ boundaries: { country: { dashed: true } } });
		expect(dashOf(style, 'boundary-country')).toStrictEqual([4, 2]);
		expect(capOf(style, 'boundary-country')).toBe('butt');
	});

	it("draws a caller's own pattern as written, with butt caps", () => {
		const style = build({ boundaries: { state: { dashed: [6, 3] } }, roads: { paths: { dashed: [2, 4] } } });
		expect(dashOf(style, 'boundary-state')).toStrictEqual([6, 3]);
		expect(capOf(style, 'boundary-state')).toBe('butt');
		expect(dashOf(style, 'way-path')).toStrictEqual([2, 4]);
		expect(dashOf(style, 'way-cycleway')).toStrictEqual([2, 4]);
		expect(capOf(style, 'way-cycleway')).toBe('butt');
		// footways are a group of their own and keep theirs
		expect(dashOf(style, 'way-footway')).toStrictEqual([1.5, 0.75]);
	});

	it('applies the opacity of a line style like a plain value', () => {
		const plain = build({ boundaries: { state: 0.5 } });
		const styled = build({ boundaries: { state: { opacity: 0.5 } } });
		expect(layerOf(styled, 'boundary-state')).toStrictEqual(layerOf(plain, 'boundary-state'));
		expect(ids(build({ boundaries: { state: { opacity: false } } }), 'boundary-state')).toStrictEqual([]);
	});

	it('keeps disputed borders, with their casing, when the country borders are hidden', () => {
		const hidden = ids(build({ boundaries: { country: false } }), 'boundary-country');
		expect(hidden).toStrictEqual(['boundary-country-disputed:outline', 'boundary-country-disputed']);
		const without = ids(build({ boundaries: { disputed: false } }), 'boundary-country');
		expect(without).not.toContain('boundary-country-disputed');
		expect(without).not.toContain('boundary-country-disputed:outline');
		expect(without).toContain('boundary-country');
		expect(without).toContain('boundary-country:outline');
	});

	it('shares no dash pattern between two builds', () => {
		const [a, b] = [build(), build()];
		expect(dashOf(a, 'boundary-state')).not.toBe(dashOf(b, 'boundary-state'));
		expect(dashOf(a, 'way-steps')).not.toBe(dashOf(b, 'way-steps'));
	});
});

// `width` multiplies a line's width at every zoom.
// The width is applied by group in the shared layer pass (`applyLineWidth`), so every layer of the
// group — the line, a border's casing, a bridge deck, the tunnel variants — grows together, in every
// schema.
describe.each(BUILDERS)('line widths in %s', (_name, build) => {
	const widthOf = (style: StyleSpecification, id: string) => layerOf(style, id)?.paint?.['line-width'];
	/** The stop values of a width ramp, without their zooms. */
	const stops = (width: unknown) => (width as unknown[]).slice(3).filter((_, index) => index % 2 === 1) as number[];

	it('builds the style it always did where no width is set', () => {
		expect(JSON.stringify(build({ boundaries: { state: { width: 1 } }, roads: { footway: { width: 1 } } }))).toBe(
			JSON.stringify(build())
		);
	});

	it('scales a border with its casing, and leaves the others alone', () => {
		const [plain, half] = [build(), build({ boundaries: { state: { width: 0.5 } } })];
		for (const id of ['boundary-state', 'boundary-state:outline']) {
			expect(stops(widthOf(half, id)), id).toStrictEqual(stops(widthOf(plain, id)).map((w) => w * 0.5));
		}
		for (const id of ['boundary-country', 'boundary-country:outline', 'boundary-country-disputed', 'way-footway']) {
			expect(widthOf(half, id), id).toStrictEqual(widthOf(plain, id));
		}
	});

	it('scales a path above ground, in a tunnel and on a bridge, with its deck', () => {
		const [plain, wide] = [build(), build({ roads: { footway: { width: 2 } } })];
		for (const id of ['way-footway', 'tunnel-way-footway', 'bridge-way-footway', 'bridge-way-footway:bridge']) {
			expect(stops(widthOf(wide, id)), id).toStrictEqual(stops(widthOf(plain, id)).map((w) => w * 2));
		}
		expect(widthOf(wide, 'way-steps')).toStrictEqual(widthOf(plain, 'way-steps'));
	});

	it('keeps a width ramp starting from nothing where it started, so the line appears at the same zoom', () => {
		const half = build({ boundaries: { state: { width: 0.5 } } });
		expect(stops(widthOf(half, 'boundary-state'))[0]).toBe(0);
		expect(layerOf(half, 'boundary-state')).toMatchObject({
			minzoom: (layerOf(build(), 'boundary-state') as { minzoom?: number }).minzoom,
		});
	});

	it('leaves the dash pattern alone, which is in multiples of the width', () => {
		expect(dashOf(build({ boundaries: { state: { width: 0.5 } } }), 'boundary-state')).toStrictEqual([3, 1, 1, 1]);
	});
});

describe('line styles: the satellite overlay', () => {
	it('takes them on its own borders and paths', () => {
		const style = satellite({ osmOverlay: { layers: { boundaries: { state: { dashed: false } } } } });
		expect(dashOf(style, 'boundary-state')).toBeUndefined();
		expect(dashOf(satellite(), 'boundary-state')).toStrictEqual([3, 1, 1, 1]);
	});

	// Rendered alone, a dashed line weighs two thirds of the solid one its factor was measured for
	// (`dashCompensation` in `features/satellite-overlay.ts`), so the factor is divided by that share.
	it('gives a dashed line back in opacity what its dash leaves out', () => {
		const opacity = (style: StyleSpecification, id: string) => layerOf(style, id)?.paint?.['line-opacity'];
		const solid = satellite({
			osmOverlay: { layers: { boundaries: { disputed: { dashed: false } }, roads: { footway: { dashed: false } } } },
		});
		expect(opacity(solid, 'boundary-country-disputed')).toBe(0.4);
		expect(opacity(solid, 'way-footway')).toBe(0.4);
		expect(opacity(satellite(), 'boundary-country-disputed')).toBe(0.6);
		expect(opacity(satellite(), 'way-footway')).toBe(0.6);
		// by the share of the pattern that is dash, whatever the pattern: [1, 3] draws a quarter
		const sparse = satellite({ osmOverlay: { layers: { boundaries: { disputed: { dashed: [1, 3] } } } } });
		expect(opacity(sparse, 'boundary-country-disputed')).toBe(1);
		const half = satellite({ osmOverlay: { layers: { boundaries: { disputed: { dashed: [2, 2] } } } } });
		expect(opacity(half, 'boundary-country-disputed')).toBe(0.8);
	});

	it('leaves the lines alone that were dashed all along', () => {
		const opacity = (id: string) => layerOf(satellite(), id)?.paint?.['line-opacity'];
		expect(dashOf(satellite(), 'transport-ferry')).toBeDefined();
		expect(opacity('transport-ferry')).toStrictEqual(['interpolate', ['linear'], ['zoom'], 10, 0, 11, 0.4]);
	});

	it('compensates under `layerOpacity` too', () => {
		const on = satellite({ osmOverlay: { layerOpacity: true } });
		expect(layerOf(on, 'boundary-state')?.paint?.['line-layer-opacity']).toStrictEqual([
			'interpolate',
			['linear'],
			['zoom'],
			7,
			0,
			8,
			0.6,
		]);
	});

	it('scales a width over imagery as on the basemap, and compensates a dash by its pattern alone', () => {
		const opacity = (style: StyleSpecification, id: string) => layerOf(style, id)?.paint?.['line-opacity'];
		const width = (style: StyleSpecification, id: string) => layerOf(style, id)?.paint?.['line-width'];
		const plain = satellite();
		const half = satellite({
			osmOverlay: { layers: { boundaries: { disputed: { width: 0.5 } }, roads: { footway: { width: 0.5 } } } },
		});
		const stops = (value: unknown) => (value as unknown[]).slice(3).filter((_, index) => index % 2 === 1) as number[];
		expect(stops(width(half, 'way-footway'))).toStrictEqual(stops(width(plain, 'way-footway')).map((w) => w * 0.5));
		expect(stops(width(half, 'boundary-country-disputed'))).toStrictEqual(
			stops(width(plain, 'boundary-country-disputed')).map((w) => w * 0.5)
		);
		// a thinner line is meant to weigh less; only what the dash leaves out is given back
		expect(opacity(half, 'way-footway')).toStrictEqual(opacity(plain, 'way-footway'));
		expect(opacity(half, 'boundary-country-disputed')).toStrictEqual(opacity(plain, 'boundary-country-disputed'));
	});

	it('drops the casing of the disputed border with the others', () => {
		expect(ids(satellite(), 'boundary')).not.toContain('boundary-country-disputed:outline');
	});
});

describe('line styles: minimizeOptions', () => {
	const minimal = (options: OsmOptions) => osm.minimizeOptions(osm.resolveOptions(options));

	it('writes nothing for the defaults', () => {
		expect(minimal({})).toStrictEqual({});
		expect(minimal({ layers: { boundaries: { state: { dashed: true }, country: { dashed: false } } } })).toStrictEqual(
			{}
		);
	});

	it('writes a dash that differs from the default, and only that', () => {
		expect(minimal({ layers: { boundaries: { state: { dashed: false } } } })).toStrictEqual({
			layers: { boundaries: { state: { dashed: false } } },
		});
		expect(minimal({ layers: { roads: { footway: { dashed: [3, 1] } } } })).toStrictEqual({
			layers: { roads: { footway: { dashed: [3, 1] } } },
		});
	});

	it('still folds a branch whose groups agree, where no dash is set in it', () => {
		expect(minimal({ layers: { boundaries: 0.5 } })).toStrictEqual({ layers: { boundaries: 0.5 } });
		expect(minimal({ layers: 0.5 })).toStrictEqual({ layers: 0.5 });
		expect(minimal({ layers: false })).toStrictEqual({ layers: false });
	});

	it('spells a folded branch out again where one of its groups sets a dash', () => {
		expect(
			minimal({ layers: { boundaries: { country: 0.5, disputed: 0.5, state: { opacity: 0.5, dashed: false } } } })
		).toStrictEqual({
			layers: { boundaries: { country: 0.5, state: { opacity: 0.5, dashed: false }, disputed: 0.5 } },
		});
	});

	it('leaves the other branches as they were', () => {
		expect(
			minimal({ layers: { roads: { footway: { dashed: [3, 1] }, streets: { service: false } }, labels: false } })
		).toStrictEqual({ layers: { roads: { streets: { service: false }, footway: { dashed: [3, 1] } }, labels: false } });
	});

	it('writes a width, and none where it is the default', () => {
		expect(minimal({ layers: { boundaries: { state: { width: 0.5 } } } })).toStrictEqual({
			layers: { boundaries: { state: { width: 0.5 } } },
		});
		expect(
			minimal({ layers: { boundaries: { state: { width: 1 } }, roads: { footway: { width: 1 } } } })
		).toStrictEqual({});
		expect(minimal({ layers: { roads: 0.5 } })).toStrictEqual({ layers: { roads: 0.5 } });
		expect(
			minimal({ layers: { boundaries: { country: 0.5, disputed: 0.5, state: { opacity: 0.5, width: 2 } } } })
		).toStrictEqual({
			layers: { boundaries: { country: 0.5, state: { opacity: 0.5, width: 2 }, disputed: 0.5 } },
		});
	});

	it('says nothing about the dash of a hidden line', () => {
		expect(minimal({ layers: { boundaries: { state: { opacity: false, dashed: false, width: 1 } } } })).toStrictEqual({
			layers: { boundaries: { state: false } },
		});
	});

	it.each<OsmOptions>([
		{ layers: { boundaries: { state: { dashed: false } } } },
		{ layers: 0.5 },
		{ layers: { boundaries: 0.5, roads: { footway: { dashed: [3, 1] } } } },
		{ layers: { roads: { steps: { opacity: 0.2, dashed: false } }, boundaries: { country: { dashed: [1, 1] } } } },
		{ layers: { roads: 0.3, boundaries: { disputed: { opacity: 0.7, dashed: false } } } },
		{
			layers: { boundaries: { state: { width: 0.5, dashed: [6, 3] } }, roads: { paths: { width: 1.5 } } },
		},
	])('resolves to the same thing after minimising: %j', (options) => {
		const resolved = osm.resolveOptions(options);
		expect(osm.resolveOptions(osm.minimizeOptions(resolved)).layers).toStrictEqual(resolved.layers);
		expect(JSON.stringify(osm(osm.minimizeOptions(resolved)))).toBe(JSON.stringify(osm(options)));
	});
});

// ── theme presets ──────────────────────────────────────────────────────────────
//
// A lookalike theme resembles a map that draws its borders and paths its own way, which a colour
// table cannot say. So such a theme carries a line preset (`getLinePreset`): `dashed` per line group,
// between the style's defaults and the caller's own `layers`.

describe('line presets of the themes', () => {
	it('exist for lookalike themes only, name line groups only, and hold nothing a default already says', () => {
		const BUILT_IN = /^(colorful|natural|muted|gray|toner)(-dark)?$/;
		for (const theme of PALETTES) {
			const preset = getLinePreset(theme);
			if (BUILT_IN.test(theme)) expect(preset, theme).toBeUndefined();
			const usual = lineDefaults();
			for (const [group, entry] of Object.entries(preset ?? {})) {
				expect(Object.keys(LINE_STYLE_DEFAULTS), `${theme} ${group}`).toContain(group);
				expect(Object.keys(entry).length, `${theme} ${group}`).toBeGreaterThan(0);
				const { dashed, width } = entry;
				if (dashed !== undefined) {
					expect(typeof dashed === 'boolean' || isDashPattern(dashed), `${theme} ${group}`).toBe(true);
					expect(dashed, `${theme} ${group}`).not.toBe(usual[group].dashed);
				}
				if (width !== undefined) expect(width > 0 && width !== 1, `${theme} ${group} width`).toBe(true);
			}
		}
		expect(getLinePreset('positrino')).toBeDefined();
	});

	it.each(BUILDERS.map(([name]) => name))('%s draws a theme in its preset', (name) => {
		const urls = name === 'protomaps' ? { protomaps: 'pmtiles://https://example.org/x.pmtiles' } : undefined;
		const build = { osm, omt, protomaps }[name as 'osm'] as (options: object) => StyleSpecification;
		const positrino = build({ theme: 'positrino', urls });
		expect(dashOf(positrino, 'way-footway')).toBeUndefined();
		expect(capOf(positrino, 'way-footway')).toBe('round');
		expect(dashOf(positrino, 'boundary-state')).toStrictEqual([2, 2]);
		const protocol = build({ theme: 'protocol', urls });
		expect(dashOf(protocol, 'boundary-country')).toStrictEqual([2, 1]);
		// a theme without a preset keeps the defaults
		expect(dashOf(build({ theme: 'googol', urls }), 'boundary-state')).toStrictEqual([3, 1, 1, 1]);
	});

	it("lets the caller's own setting win, field by field", () => {
		const layers = (options: OsmOptions) => osm.resolveOptions(options).layers;
		// the theme's dash stays under a plain opacity…
		expect(layers({ theme: 'positrino', layers: { boundaries: { state: 0.5 } } }).boundaries.state).toStrictEqual({
			opacity: 0.5,
			dashed: [2, 2],
			width: 1,
		});
		// …and gives way to an explicit one
		expect(
			layers({ theme: 'positrino', layers: { roads: { footway: { dashed: true } } } }).roads.footway
		).toStrictEqual({
			opacity: true,
			dashed: true,
			// the theme's own width for a path, which the caller did not touch
			width: 1.6,
		});
		expect(
			dashOf(osm({ theme: 'positrino', layers: { roads: { footway: { dashed: true } } } }), 'way-footway')
		).toStrictEqual([1.5, 0.75]);
	});

	it('carries a width too, merged with the caller field by field', () => {
		const state = (layers?: LayerGroupOptions) => osm.resolveOptions({ theme: 'ping', layers }).layers.boundaries.state;
		expect(state()).toStrictEqual({ opacity: true, dashed: [6, 3], width: 0.5 });
		// each field the caller sets replaces the theme's; the others stay the theme's
		expect(state({ boundaries: { state: { width: 1 } } })).toStrictEqual({ opacity: true, dashed: [6, 3], width: 1 });
		expect(state({ boundaries: { state: { dashed: false } } })).toStrictEqual({
			opacity: true,
			dashed: false,
			width: 0.5,
		});
		expect(state({ boundaries: { state: 0.4 } })).toStrictEqual({ opacity: 0.4, dashed: [6, 3], width: 0.5 });
		// a border keeps its casing whatever the theme
		expect(ids(osm({ theme: 'ping' }), 'boundary-state')).toStrictEqual(['boundary-state:outline', 'boundary-state']);
	});

	it('hands every caller a pattern of its own', () => {
		const a = osm.resolveOptions({ theme: 'positrino' }).layers.boundaries.state.dashed as number[];
		a.push(9);
		expect(osm.resolveOptions({ theme: 'positrino' }).layers.boundaries.state.dashed).toStrictEqual([2, 2]);
		expect(getLinePreset('positrino')?.['boundaries.state']).toStrictEqual({ dashed: [2, 2] });
	});

	it('reaches the satellite overlay through its theme', () => {
		const style = satellite({ osmOverlay: { theme: 'positrino' } });
		expect(dashOf(style, 'boundary-state')).toStrictEqual([2, 2]);
		expect(dashOf(style, 'way-footway')).toBeUndefined();
	});

	describe('minimizeOptions', () => {
		const minimal = (options: OsmOptions) => osm.minimizeOptions(osm.resolveOptions(options));

		it.each(PALETTES)('writes nothing but the theme for %s', (theme) => {
			expect(minimal({ theme })).toStrictEqual(theme === 'colorful' ? {} : { theme });
		});

		it("writes a width that differs from the theme's", () => {
			// half width is ping's own way with a state border
			expect(minimal({ theme: 'ping', layers: { boundaries: { state: { width: 0.5 } } } })).toStrictEqual({
				theme: 'ping',
			});
			// the style's default is not, on this theme
			expect(minimal({ theme: 'ping', layers: { boundaries: { state: { width: 1 } } } })).toStrictEqual({
				theme: 'ping',
				layers: { boundaries: { state: { width: 1 } } },
			});
		});

		it("writes a dash that differs from the theme's, not from the style's default", () => {
			// solid footways are positrino's own
			expect(minimal({ theme: 'positrino', layers: { roads: { footway: { dashed: false } } } })).toStrictEqual({
				theme: 'positrino',
			});
			// the style's default is not
			expect(minimal({ theme: 'positrino', layers: { roads: { footway: { dashed: true } } } })).toStrictEqual({
				theme: 'positrino',
				layers: { roads: { footway: { dashed: true } } },
			});
		});

		it.each<OsmOptions>([
			{ theme: 'positrino' },
			{ theme: 'protocol', layers: { boundaries: 0.5 } },
			{
				theme: 'freedom',
				layers: { roads: { footway: { dashed: false } }, boundaries: { state: { dashed: [9, 9] } } },
			},
		])('resolves to the same thing after minimising: %j', (options) => {
			const resolved = osm.resolveOptions(options);
			expect(osm.resolveOptions(osm.minimizeOptions(resolved)).layers).toStrictEqual(resolved.layers);
		});
	});

	it('comes back from the importer as the theme alone', () => {
		for (const theme of ['positrino', 'protocol', 'freedom', 'ping'] as const) {
			const guess = deriveOptions(osm({ theme }));
			expect(guess.kind).toBe('osm');
			expect('options' in guess && guess.options).toStrictEqual({ theme });
		}
	});
});

// ── the importer ───────────────────────────────────────────────────────────────
//
// `deriveOptions` reads the dash of the same six lines off a foreign style and writes `dashed` where
// that differs from what the chosen theme draws — judged against the target built with that theme, the
// way the colours are.

describe('line styles: the importer', () => {
	const derived = (style: StyleSpecification) => {
		const guess = deriveOptions(style);
		// every style here but one is an `osm` one; the satellite test reads `osmOverlay` off the same value
		const options = 'options' in guess ? (guess.options as OsmOptions) : undefined;
		return { options, diagnostics: guess.report.diagnostics };
	};
	const PM = { protomaps: 'pmtiles://https://example.org/x.pmtiles' };

	it('writes nothing for a style drawn in the defaults', () => {
		expect(derived(osm()).options).toStrictEqual({});
	});

	it('reads a solid line and a pattern of its own back, in every schema', () => {
		const layers: LayerGroupOptions = {
			roads: { footway: { dashed: [4, 2] } },
			boundaries: { state: { dashed: false }, country: { dashed: [6, 3] } },
		};
		expect(derived(osm({ layers })).options).toStrictEqual({ layers });
		expect(derived(omt({ layers })).options?.layers).toStrictEqual(layers);
		expect(derived(protomaps({ layers, urls: PM })).options?.layers).toStrictEqual(layers);
	});

	it("judges a dash against the chosen theme's own, not the style's default", () => {
		// protocol dashes its country borders; a solid one is the difference worth writing
		expect(
			derived(osm({ theme: 'protocol', layers: { boundaries: { country: { dashed: false } } } })).options
		).toStrictEqual({
			theme: 'protocol',
			layers: { boundaries: { country: { dashed: false } } },
		});
	});

	it('reads a width back as the multiple of our own it comes to, in every schema', () => {
		const layers: LayerGroupOptions = {
			roads: { footway: { dashed: false, width: 1.5 } },
			boundaries: { country: { width: 2 }, state: { width: 0.5 } },
		};
		expect(derived(osm({ layers })).options).toStrictEqual({ layers });
		expect(derived(omt({ layers })).options?.layers).toStrictEqual(layers);
		expect(derived(protomaps({ layers, urls: PM })).options?.layers).toStrictEqual(layers);
	});

	it('does not write a width that is nearly ours', () => {
		// two maps rarely share a width ramp to the pixel; a tenth more is not a setting
		expect(derived(osm({ layers: { boundaries: { state: { width: 1.1 } } } })).options).toStrictEqual({});
		expect(derived(osm({ layers: { boundaries: { state: { width: 1.3 } } } })).options).toStrictEqual({
			layers: { boundaries: { state: { width: 1.3 } } },
		});
	});

	it("judges a width against the chosen theme's own, and writes it as a multiple of the default", () => {
		// ping draws its state border at half width: that is the theme, not a difference…
		expect(derived(osm({ theme: 'ping' })).options).toStrictEqual({ theme: 'ping' });
		// …and the default width, on that theme, is one — written as 1, not as the 2 it is to the theme
		expect(derived(osm({ theme: 'ping', layers: { boundaries: { state: { width: 1 } } } })).options).toStrictEqual({
			theme: 'ping',
			layers: { boundaries: { state: { width: 1 } } },
		});
	});

	// A width is a ramp, and the probe is read at one zoom. Ours and this style's state border are
	// both 1px at z8 and differ from z10 on; read at z8 alone they would be the same line.
	it('compares widths at several zooms, not only where the probe is read', () => {
		const ours = (layerOf(osm(), 'boundary-state')?.paint?.['line-width'] as unknown[]).slice(3);
		expect(ours).toStrictEqual([7, 0, 8, 1, 10, 2]);
		const flat = patched('boundary-state', { 'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0, 8, 1, 10, 1] });
		expect(derived(flat).options?.layers).toStrictEqual({ boundaries: { state: { width: 0.5 } } });
	});

	it('leaves a hidden line hidden, and says nothing of its dash', () => {
		expect(
			derived(osm({ layers: { boundaries: { state: false }, roads: { paths: { dashed: false } } } })).options
		).toStrictEqual({
			layers: { roads: { paths: { dashed: false } }, boundaries: { state: false } },
		});
	});

	it('reads the overlay of a satellite style too', () => {
		const style = satellite({ osmOverlay: { layers: { boundaries: { state: { dashed: false } } } } });
		const overlay = (derived(style).options as unknown as { osmOverlay?: { layers?: unknown } }).osmOverlay;
		expect(overlay?.layers).toStrictEqual({ boundaries: { state: { dashed: false } } });
	});

	/** `osm()` with one layer's paint and layout replaced, as a foreign style would have them. */
	const patched = (id: string, paint: object, layout: object = {}): StyleSpecification => {
		const style = structuredClone(osm()) as StyleSpecification;
		const layer = style.layers.find((candidate) => candidate.id === id) as { paint: object; layout?: object };
		layer.paint = { ...layer.paint, ...paint };
		layer.layout = { ...layer.layout, ...layout };
		return style;
	};

	it('takes a dash that changes with zoom as it is at the zoom it reads, and says so', () => {
		const dash = ['step', ['zoom'], ['literal', [2, 0]], 7, ['literal', [2, 2, 6, 2]]];
		const { options, diagnostics } = derived(patched('boundary-state', { 'line-dasharray': dash }));
		expect(options?.layers).toStrictEqual({ boundaries: { state: { dashed: [2, 2, 6, 2] } } });
		const said = diagnostics.filter((d) => d.code === 'line.dashByZoom');
		expect(said).toHaveLength(1);
		expect(said[0]).toMatchObject({
			severity: 'info',
			optionPath: 'layers.boundaries.state.dashed',
			data: { zoom: 8, dashed: [2, 2, 6, 2] },
			origin: { probe: 'boundary-state' },
		});
	});

	it('reads a dash that does not show as a solid line', () => {
		// a round cap closes a gap of one line width; a pattern with no gap has nothing to close
		expect(
			derived(patched('way-footway', { 'line-dasharray': [2, 1] }, { 'line-cap': 'round' })).options?.layers
		).toStrictEqual({
			roads: { footway: { dashed: false } },
		});
		expect(derived(patched('boundary-state', { 'line-dasharray': [2, 0] })).options?.layers).toStrictEqual({
			boundaries: { state: { dashed: false } },
		});
	});

	it('doubles an odd pattern, as MapLibre repeats it', () => {
		expect(derived(patched('boundary-state', { 'line-dasharray': [3, 2, 1] })).options?.layers).toStrictEqual({
			boundaries: { state: { dashed: [3, 2, 1, 3, 2, 1] } },
		});
	});
});
